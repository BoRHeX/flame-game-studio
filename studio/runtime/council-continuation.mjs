// Continue a REAL completed 25-role council without repeating the first 25 API calls.
// Four source-owning specialists produce four individual files in dependency order.
// Independent source review happens before secret-free code/test execution. No live merges.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {getCrew} from '../orchestrator/roster.mjs';
import {validateWorkOrder} from '../orchestrator/context.mjs';
import {validateProposal} from './proposal.mjs';
import {ModelBudget,callStructured} from './runner.mjs';
import {validateCouncil,validateIntegratedFiles,REQUIRED_FILES} from './council-wave.mjs';

const oneFileSchema={
 type:'object',properties:{
  summary:{type:'string'},content:{type:'string'},
  tests:{type:'array',items:{type:'string'}},
  risks:{type:'array',items:{type:'string'}}
 },required:['summary','content','tests','risks'],additionalProperties:false
};
const reviewSchema={
 type:'object',properties:{
  approved:{type:'boolean'},
  concerns:{type:'array',items:{type:'string'}},
  missing_tests:{type:'array',items:{type:'string'}},
  repair_path:{type:'string'}
 },required:['approved','concerns','missing_tests','repair_path'],additionalProperties:false
};
export const STAGES=Object.freeze([
 {role:'mission_engineer',path:'game/missions/jobs.mjs',maxOutput:8500,
  focus:'Preserve the JOBS array and MissionEvaluator public API. Make three solvable but MEANINGFULLY DIFFERENT industrial jobs with distinct warnings, operator dependencies, natural failure conditions and payouts. Keep the same job IDs, known burner/chamber keys and current payout/funds requirements.'},
 {role:'npc_engineer',path:'game/npc/operator.mjs',maxOutput:7500,
  focus:'Implement a genuine deterministic OperatorAI class export. Use no DOM or browser-only global. Operator interaction returns an explicit result with dialogue/icons and bounded physical command/wait/refuse state, without deadlocking essential missions. Provide snapshot()/restore() and discrete feedback that integrator can display.'},
 {role:'persistence_engineer',path:'game/persistence/save-slots.mjs',maxOutput:9000,
  focus:'Implement an exported SaveStore class, constructor optional storage injection, with three independent versioned slots, validated JSON, backup-on-write, corrupted JSON recovery, manual save/load and autosave. Must work with localStorage and in-memory test adapters; no network; do not use device time as authority for currency creation.'},
 {role:'integrator',path:'game/main.mjs',maxOutput:17500,
  focus:'Preserve and adapt the FULL current game/main.mjs source. Import OperatorAI from ./npc/operator.mjs and SaveStore from ./persistence/save-slots.mjs, USE them in physical hub interaction, actual mission state and autosave/resume. Integrate distinct JOBS/MissionEvaluator; keep old touch joystick, fullscreen, ladders, platform physics, flame rendering, ProcessSound, controls, hazards, timers, payouts, HUD and camera. Avoid additional HTML/CSS files. Provide complete code, not a diff.'}
]);
const read=(p,n=22000)=>existsSync(p)?readFileSync(p,'utf8').slice(0,n):'';
const saveJson=(p,obj)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(obj,null,2)+'\n','utf8');};
export function validateSpecialistStages(stages=STAGES){
 if(stages.length!==REQUIRED_FILES.length)return false;
 const paths=stages.map(s=>s.path),roles=stages.map(s=>s.role);
 return new Set(paths).size===4&&REQUIRED_FILES.every(p=>paths.includes(p))&&new Set(roles).size===4;
}
export async function runContinuation(orderPath,outPath='artifacts/ice-proposal.json',{
 fetchImpl=fetch,reportPath='artifacts/ice-spend-report.json',
 rejectedPath='artifacts/ice-rejected-candidate.json',
 councilPath='artifacts/ice-council-report.json'
}={}){
 const order=JSON.parse(readFileSync(orderPath,'utf8'));
 validateWorkOrder(order);
 if(order.id!=='ICE-P2-CONT-01'||order.role!=='integrator'||!validateSpecialistStages())
  throw Error('not the approved four-specialist continuation');
 if(process.env.ICE_STUDIO_ENABLED!=='true')throw Error('studio is disabled');
 const runId=String(process.env.GITHUB_RUN_ID??''),sourceSha=process.env.GITHUB_SHA;
 if(!/^\d+$/.test(runId)||!sourceSha)throw Error('invalid workflow execution');
 const crew=getCrew(),council=JSON.parse(readFileSync(councilPath,'utf8'));
 validateCouncil(crew,council.contributions);
 if(council.runId!=='43120683621'||council.completed!==25)
  throw Error('invalid or incomplete frozen council handoff');
 const cost=new ModelBudget(Math.min(order.max_cost_usd,2));
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw Error('provider key missing');
 const originalMain=read('game/main.mjs',50000);
 const gameSources=[
  {path:'game/main.mjs',body:originalMain},
  {path:'game/missions/jobs.mjs',body:read('game/missions/jobs.mjs',20000)},
  {path:'game/simulation/burner.mjs',body:read('game/simulation/burner.mjs',22000)},
  {path:'game/core/clocks.mjs',body:read('game/core/clocks.mjs',16000)},
  {path:'game/player/platformer.mjs',body:read('game/player/platformer.mjs',22000)},
  {path:'game/index.html',body:read('game/index.html',15000)},
  {path:'game/style.css',body:read('game/style.css',16000)}
 ];
 const handoffs=council.contributions;
 const design={canon:read('design/game-bible.md',11000),passTwo:read('design/pass-two-operator.md',9000)};
 const generated=[];let status='failed',review=null,lastCandidate=null;
 try{
  for(const stage of STAGES){
   const role=crew.find(x=>x.id===stage.role);
   if(!role)throw Error('specialist missing: '+stage.role);
   const applicable=handoffs.filter(c=>c.role===stage.role||
     ['technical_director','game_director','integrator','qa_architect','producer'].includes(c.role)||
     (stage.role==='integrator')||
     (stage.role==='npc_engineer'&&['narrative_designer','gameplay_engineer'].includes(c.role))||
     (stage.role==='mission_engineer'&&['combustion_engineer','chamber_designer','economy_engineer'].includes(c.role))||
     (stage.role==='persistence_engineer'&&['security_release_engineer','ux_designer'].includes(c.role)));
   const brief={
    orderId:order.id,stage:stage.role,path:stage.path,goal:stage.focus,
    constraints:order.acceptance,
    existing:stage.role==='integrator'?gameSources:gameSources.filter(x=>
     x.path===stage.path||x.path==='game/main.mjs'||x.path==='game/missions/jobs.mjs'||x.path==='game/simulation/burner.mjs'),
    priorGenerated:generated,design,councilHandoffs:applicable.map(c=>({
     role:c.role,action:c.concrete_action,contract:c.subsystem_contract,risk:c.regression_risk}))
   };
   const implementation=await callStructured({
    key,model:'gpt-6.1-terra',step:'implement_'+stage.role,
    instructions:role.profile.system_instructions+
     ' Produce only the COMPLETE source text for your assigned target file, no diff and no other file. You are a coding specialist and this must be real compilable code. Respect exact current public imports/exports and every accepted earlier stage. Do not claim to have executed code. No files are executed in this credentialed job.',
    input:JSON.stringify(brief),schema:oneFileSchema,name:'ice_specialist_module',max_output_tokens:stage.maxOutput,
    budget:cost,fetchImpl
   });
   if(typeof implementation.content!=='string'||implementation.content.trim().length<180)
    throw Error('specialist did not provide a full module: '+stage.path);
   generated.push({path:stage.path,content:implementation.content,summary:implementation.summary,
    tests:implementation.tests,risks:implementation.risks,role:stage.role});
   console.log('SPECIALIST IMPLEMENTATION '+generated.length+'/4 '+stage.role+' '+implementation.content.length+' bytes');
  }
  const qa=crew.find(c=>c.id==='qa_architect');
  for(let revision=0;revision<=1;revision++){
   const proposal={
    schemaVersion:1,orderId:order.id,runId,role:'integrator',sourceSha,
    summary:'25-role council + four source-owning specialists: NPC, missions, saves and integrated runtime',
    changes:generated.map(({path,content})=>({path,content})),
    tests:generated.flatMap(x=>x.tests||[]),
    risks:generated.flatMap(x=>x.risks||[]),
    council:handoffs,councilSourceRunId:council.runId,
    specialists:generated.map(({role,path,summary})=>({role,path,summary})),costUsd:0,modelAudit:[]
   };
   lastCandidate=proposal;
   let error=null;
   try{validateIntegratedFiles(proposal);validateProposal(proposal,order);}
   catch(e){error=String(e.message);}
   if(error)review={approved:false,concerns:[error],missing_tests:[],repair_path:generated.at(-1).path};
   else review=await callStructured({
    key,model:'gpt-6-luna',step:'four_specialist_pre_execution_qa_'+revision,
    instructions:qa.profile.system_instructions+
     ' You are independent hostile SOURCE QA. Confirm ALL four actual modules are complete and import-compatible, preserve mobile traversal and combustion, implement real autosave/restore, distinct missions and non-deadlocking operator interaction. You are NOT running tests; npm and Chrome checks run after source approval. On rejection specify ONE exact repair_path from the changed files. Never invent a different path.',
    input:JSON.stringify({goal:order.goal,acceptance:order.acceptance,
     files:proposal.changes,originalMain,design,sourceSha}),
    schema:reviewSchema,name:'ice_four_module_qa',max_output_tokens:2300,budget:cost,fetchImpl
   });
   if(review.approved){
    proposal.review=review;proposal.costUsd=Number(cost.spent.toFixed(7));proposal.modelAudit=cost.calls;
    proposal.revisions=revision;saveJson(outPath,proposal);status='accepted';
    console.log('FOUR SPECIALISTS ACCEPTED WITH 25 EARLIER HANDOFFS cost='+proposal.costUsd);
    return proposal;
   }
   if(revision===1)throw Error('independent source QA rejected specialist implementation: '+review.concerns.join('; ').slice(0,650));
   const fixPath=REQUIRED_FILES.includes(review.repair_path)?review.repair_path:STAGES.at(-1).path;
   const stage=STAGES.find(s=>s.path===fixPath);
   const role=crew.find(r=>r.id===stage.role),index=generated.findIndex(x=>x.path===fixPath);
   const repair=await callStructured({
    key,model:'gpt-6.1-terra',step:'repair_'+stage.role,
    instructions:role.profile.system_instructions+
     ' Independent source QA found a concrete defect in your assigned source. Rewrite the ENTIRE corrected file; preserve all correct APIs and all other module contracts. No diffs. No changes to other files.',
    input:JSON.stringify({target:stage,review,previous:generated[index],
      otherModules:generated.filter(x=>x.path!==fixPath),
      original:gameSources.find(x=>x.path===fixPath)?.body||'',design,
      acceptance:order.acceptance}),
    schema:oneFileSchema,name:'ice_repaired_module',
    max_output_tokens:stage.maxOutput,budget:cost,fetchImpl
   });
   generated[index]={path:stage.path,content:repair.content,summary:repair.summary,
    tests:repair.tests,risks:repair.risks,role:stage.role};
  }
  throw Error('unreachable source review');
 }catch(e){
  if(lastCandidate)saveJson(rejectedPath,{runId,orderId:order.id,candidate:lastCandidate,review,
   reason:String(e.message).slice(0,1000)});
  throw e;
 }finally{
  saveJson(reportPath,{runId,orderId:order.id,status,billingComplete:cost.accountingCertain,
   costUsd:Number(cost.spent.toFixed(7)),modelAudit:cost.calls,
   reusedCouncilRunId:council.runId,completedSpecialists:generated.map(x=>x.role)});
 }
}
if(process.argv[1]&&process.argv[1].endsWith('/council-continuation.mjs'))
 await runContinuation(process.argv[2],process.argv[3]);
