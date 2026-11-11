// One bounded API-backed production session: planner -> specialist -> adversarial reviewer.
// Outputs an inert JSON proposal artifact; does not execute/write model-generated code.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {buildBrief} from './brief.mjs';
import {validateProposal} from './proposal.mjs';
import {dollarsForTokens} from '../budget/guards.mjs';
const ROOT=new URL('../../',import.meta.url);
const prices=JSON.parse(readFileSync(new URL('studio/budget/prices.json',ROOT),'utf8')).models;
const policy=JSON.parse(readFileSync(new URL('studio/budget/policy.json',ROOT),'utf8'));
const outputSchema={type:'object',properties:{
 summary:{type:'string'},
 changes:{type:'array',items:{type:'object',properties:{
  path:{type:'string'},content:{type:'string'}},required:['path','content'],additionalProperties:false}},
 tests:{type:'array',items:{type:'string'}},
 risks:{type:'array',items:{type:'string'}}
},required:['summary','changes','tests','risks'],additionalProperties:false};
const planSchema={type:'object',properties:{summary:{type:'string'},steps:{type:'array',items:{type:'string'}},contracts:{type:'array',items:{type:'string'}}},required:['summary','steps','contracts'],additionalProperties:false};
const reviewSchema={type:'object',properties:{approved:{type:'boolean'},concerns:{type:'array',items:{type:'string'}},missing_tests:{type:'array',items:{type:'string'}}},required:['approved','concerns','missing_tests'],additionalProperties:false};
const textFromResponse=(r)=>(r.output??[]).filter(x=>x.type==='message').flatMap(m=>m.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
export function calculateUsageCost(usage,model){
 const p=prices[model];
 if(!p)throw Error('unsupported priced model: '+model);
 const input=usage?.input_tokens,output=usage?.output_tokens,cached=usage?.input_tokens_details?.cached_tokens??0;
 if(!Number.isInteger(input)||!Number.isInteger(output)||input<0||output<0)
  throw Error('provider did not return auditable token usage');
 return dollarsForTokens({input,cached,output},p);
}
export class ModelBudget{
 constructor(cap){if(!Number.isFinite(cap)||cap<=0)throw Error('invalid run cap');this.cap=cap;this.spent=0;this.calls=[];}
 bound(body,model){
  const p=prices[model];if(!p)throw Error('model not on approved price list');
  // Extremely conservative text-input bound: every UTF-8 byte treated as an input token.
  // Also counts the full request JSON, not just the visible prompt.
  const worstInput=Buffer.byteLength(JSON.stringify(body));
  const upper=dollarsForTokens({input:worstInput,cached:0,output:body.max_output_tokens},p);
  if(this.spent+upper>this.cap+1e-9)throw Error('request may exceed reserved budget');
  return upper;
 }
 record(response,model,step){
  const cost=calculateUsageCost(response.usage,model);
  if(this.spent+cost>this.cap+1e-9)throw Error('model usage exceeded run cap; stop and investigate');
  this.spent+=cost;
  this.calls.push({step,model,usage:response.usage,costUsd:Number(cost.toFixed(7))});
 }
}
export async function callStructured({key,model,instructions,input,schema,name,max_output_tokens,budget,step,fetchImpl=fetch}){
 if(!key)throw Error('OPENAI_API_KEY not configured');
 const body={model,instructions,input,max_output_tokens,store:false,
  text:{format:{type:'json_schema',name,strict:true,schema}}};
 budget.bound(body,model);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
 let response;
 try{
  response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify(body),signal:controller.signal});
 }finally{clearTimeout(timeout);}
 const result=await response.json();
 if(!response.ok())throw Error('OpenAI API '+response.status+': '+String(result.error?.message??'provider error').slice(0,220));
 if(result.status!=='completed')throw Error('non-completed model response; no automatic paid retry');
 budget.record(result,model,step);
 const raw=textFromResponse(result);
 if(!raw||raw.length>260000)throw Error('model returned empty or oversized structured output');
 try{return JSON.parse(raw);}catch{throw Error('model output was not valid JSON');}
}
export async function runSession(orderPath,outPath,{fetchImpl=fetch}={}){
 if(policy.STUDIO_ENABLED!==true||policy.ENFORCEMENT_IMPLEMENTED!==true||policy.DURABLE_LEDGER_ENABLED!==true||
   process.env.ICE_STUDIO_ENABLED!=='true')throw Error('paid studio is disabled');
 const brief=buildBrief(orderPath),order=brief.order;
 if(!/^\d+$/.test(String(process.env.GITHUB_RUN_ID??'')))throw Error('run ID required');
 const cap=Math.min(order.max_cost_usd,policy.MAX_RUN_COST_USD);
 const budget=new ModelBudget(cap);
 const key=process.env.OPENAI_API_KEY;
 const compactBrief=JSON.stringify(brief);
 const plan=await callStructured({key,model:'gpt-6-luna',step:'producer',
  instructions:'You are the I.C.E. executive producer. Read canon as immutable. Produce a very small executable plan for the assigned specialist. No additional scope. Never invent missing visual references.',
  input:compactBrief,schema:planSchema,name:'ice_production_plan',max_output_tokens:900,budget,fetchImpl});
 const implementation=await callStructured({key,model:'gpt-6.1-terra',step:order.role,
  instructions:'You are a scoped I.C.E. game-development specialist. Output complete UTF-8 source files only inside allowed_paths. Do not edit workflows/tests/studio or core contracts. Preserve browser compatibility, canonical vision and existing working gameplay. Do not claim external image/audio files exist. Keep total output under four files.',
  input:JSON.stringify({brief,plan}),schema:outputSchema,name:'ice_code_candidate',max_output_tokens:12000,budget,fetchImpl});
 const proposal={schemaVersion:1,orderId:order.id,runId:String(process.env.GITHUB_RUN_ID),
  role:order.role,sourceSha:brief.sourceSha,
  summary:implementation.summary,changes:implementation.changes,tests:implementation.tests,
  risks:implementation.risks,costUsd:0,modelAudit:[]};
 validateProposal(proposal,order);
 const review=await callStructured({key,model:'gpt-6-luna',step:'independent_reviewer',
  instructions:'You are independent I.C.E. reviewer. Reject unsafe, out-of-scope, incoherent or untestable patches. Do not overlook gameplay regressions or design-bible conflicts. Respond with strict JSON only.',
  input:JSON.stringify({goal:order.goal,acceptance:order.acceptance,canon:brief.roleBrief.canon,
    files:implementation.changes,tests:implementation.tests,risks:implementation.risks}),
  schema:reviewSchema,name:'ice_independent_review',max_output_tokens:1100,budget,fetchImpl});
 if(!review.approved)throw Error('independent reviewer rejected candidate: '+review.concerns.join('; ').slice(0,500));
 proposal.costUsd=Number(budget.spent.toFixed(7));
 proposal.modelAudit=budget.calls;
 proposal.review=review;
 mkdirSync(dirname(outPath),{recursive:true});
 writeFileSync(outPath,JSON.stringify(proposal,null,2)+'\n','utf8');
 console.log('MODEL SESSION: '+order.id+' files='+proposal.changes.length+' charged estimate=$'+proposal.costUsd);
 return proposal;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).pathname===new URL(import.meta.url).pathname){
 await runSession(process.argv[2],process.argv[3]??'artifacts/ice-proposal.json');
}
