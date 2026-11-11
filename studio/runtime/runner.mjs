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
 constructor(cap){if(!Number.isFinite(cap)||cap<=0)throw Error('invalid run cap');this.cap=cap;this.spent=0;this.calls=[];this.accountingCertain=true;}
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
  reasoning:{effort:'low'},
  text:{format:{type:'json_schema',name,strict:true,schema}}};
 budget.bound(body,model);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
 let response;
 try{
  response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify(body),signal:controller.signal});
 }catch(error){
  // A request without a returned usage record might still be billable.
  budget.accountingCertain=false;
  throw error;
 }finally{clearTimeout(timeout);}
 let result;
 try{result=await response.json();}
 catch(error){budget.accountingCertain=false;throw error;}
 if(!response.ok){
  budget.accountingCertain=false;
  throw Error('OpenAI API '+response.status+': '+String(result.error?.message??'provider error').slice(0,220));
 }
 if(!result.usage){budget.accountingCertain=false;throw Error('missing auditable provider usage for '+step);}
 budget.record(result,model,step);
 if(result.status!=='completed'){
  const reason=String(result.incomplete_details?.reason??'unknown');
  throw Error('model '+step+' incomplete ('+reason+'); input='+result.usage.input_tokens+
    ', output='+result.usage.output_tokens+'; no automatic paid retry');
 }
 const raw=textFromResponse(result);
 if(!raw||raw.length>260000)throw Error('model returned empty or oversized structured output');
 try{return JSON.parse(raw);}catch{throw Error('model output was not valid JSON');}
}
export async function runSession(orderPath,outPath,{fetchImpl=fetch,reportPath='artifacts/ice-spend-report.json'}={}){
 if(policy.STUDIO_ENABLED!==true||policy.ENFORCEMENT_IMPLEMENTED!==true||policy.DURABLE_LEDGER_ENABLED!==true||
   process.env.ICE_STUDIO_ENABLED!=='true')throw Error('paid studio is disabled');
 const brief=buildBrief(orderPath),order=brief.order;
 if(!/^\d+$/.test(String(process.env.GITHUB_RUN_ID??'')))throw Error('run ID required');
 const cap=Math.min(order.max_cost_usd,policy.MAX_RUN_COST_USD);
 const budget=new ModelBudget(cap);
 const key=process.env.OPENAI_API_KEY;
 let outcome='failed';
 try{
  const plan=await callStructured({key,model:'gpt-6-luna',step:'producer',
   instructions:'You are the I.C.E. executive producer. Canonical game rules are immutable. Produce a small, executable plan for the specific specialist; stay within declared paths. Do not invent missing visual reference assets.',
   input:JSON.stringify(brief),schema:planSchema,name:'ice_production_plan',
   max_output_tokens:3000,budget,fetchImpl});
  let implementation=await callStructured({key,model:'gpt-6.1-terra',step:order.role,
   instructions:'You are a scoped I.C.E. development specialist. Produce complete UTF-8 source only inside allowed_paths. Respect imports, project-local geometry and existing API contracts. Do not edit workflow/test/studio code. Preserve Chrome gameplay; keep total output at most four files. Review your module imports carefully.',
   input:JSON.stringify({brief,plan}),schema:outputSchema,name:'ice_code_candidate',
   max_output_tokens:12000,budget,fetchImpl});
  let review;
  // One bounded corrective iteration. A rejected revision stops the run; never
  // convert a rejection into an unreviewed PR and never spawn unlimited loops.
  const maxRevisions=Math.min(1,Math.max(0,policy.MAX_REVISIONS_PER_TASK??0));
  for(let revision=0;revision<=maxRevisions;revision++){
   const current={schemaVersion:1,orderId:order.id,runId:String(process.env.GITHUB_RUN_ID),
    role:order.role,sourceSha:brief.sourceSha,summary:implementation.summary,
    changes:implementation.changes,tests:implementation.tests,risks:implementation.risks,
    costUsd:0,modelAudit:[]};
   validateProposal(current,order);
   review=await callStructured({key,model:'gpt-6-luna',step:revision?'final_reviewer':'independent_reviewer',
    instructions:'Independent I.C.E. reviewer. Reject invalid imports, non-portable geometry, unsafe or out-of-scope changes, fabricated assets, missing tests, and incompatibility with source contracts. Inspect the submitted changes, not just the summary. Return strict JSON with actionable concerns.',
    input:JSON.stringify({goal:order.goal,acceptance:order.acceptance,canon:brief.roleBrief.canon,
      files:implementation.changes,tests:implementation.tests,risks:implementation.risks}),
    schema:reviewSchema,name:'ice_independent_review',max_output_tokens:2500,budget,fetchImpl});
   if(review.approved){
    current.review=review;
    current.revisions=revision;
    current.costUsd=Number(budget.spent.toFixed(7));
    current.modelAudit=budget.calls;
    mkdirSync(dirname(outPath),{recursive:true});
    writeFileSync(outPath,JSON.stringify(current,null,2)+'\n','utf8');
    outcome='accepted';
    console.log('MODEL SESSION: '+order.id+' accepted after '+revision+' corrections; costUsd='+current.costUsd);
    return current;
   }
   const problems=[...review.concerns,...review.missing_tests].filter(Boolean);
   if(revision>=maxRevisions)throw Error('independent review rejected after '+revision+
     ' corrections: '+problems.join('; ').slice(0,800));
   if(!problems.length)throw Error('reviewer rejected candidate without actionable feedback');
   console.log('QUALITY GATE: reviewer rejected first candidate; attempting one bounded repair.');
   implementation=await callStructured({key,model:'gpt-6.1-terra',step:'specialist_repair',
    instructions:'You are repairing a rejected I.C.E. patch. Address EVERY cited defect while preserving valid behavior and allowed_paths. Return all replacement files in full, not a diff. Verify imports against provided source paths, avoid hard-coded assumptions, and maintain deterministic mobile performance. No changes to CI, memory or simulation contracts.',
    input:JSON.stringify({order,plan,original:implementation,reviewFeedback:review,
      relevantSource:brief.files,architecture:brief.roleBrief}),
    schema:outputSchema,name:'ice_corrected_candidate',max_output_tokens:12000,budget,fetchImpl});
  }
  throw Error('unreachable production state');
 }catch(error){
  const failure={runId:String(process.env.GITHUB_RUN_ID),orderId:order.id,
   status:'failed',billingComplete:budget.accountingCertain,
   costUsd:Number(budget.spent.toFixed(7)),modelAudit:budget.calls,
   error:String(error?.message??error).slice(0,1000)};
  mkdirSync(dirname(reportPath),{recursive:true});
  writeFileSync(reportPath,JSON.stringify(failure,null,2)+'\n','utf8');
  throw error;
 }finally{
  // Unknown usage retains the entire budget reservation in the ledger.
  // On known usage, reconciliation should record billable calls even when QA rejects.
  if(budget.accountingCertain){
   const report={runId:String(process.env.GITHUB_RUN_ID),orderId:order.id,status:outcome,
    billingComplete:true,costUsd:Number(budget.spent.toFixed(7)),modelAudit:budget.calls};
   mkdirSync(dirname(reportPath),{recursive:true});
   writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n','utf8');
  }
 }
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 await runSession(process.argv[2],process.argv[3]??'artifacts/ice-proposal.json');
}
