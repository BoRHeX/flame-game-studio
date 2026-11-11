// On-demand 25-role production council. 25 REAL role-specific provider sessions
// contribute bounded observations; one integrator writes a connected four-file build;
// independent source QA approves/rejects BEFORE secret-free executable verification.
// Never executes model output or writes game files in this credentialed process.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {getCrew} from '../orchestrator/roster.mjs';
import {validateProposal} from './proposal.mjs';
import {ModelBudget,callStructured} from './runner.mjs';
import {validateWorkOrder} from '../orchestrator/context.mjs';

export const ROLE_COUNT=25;
export const REQUIRED_FILES=Object.freeze([
 'game/main.mjs','game/missions/jobs.mjs',
 'game/npc/operator.mjs','game/persistence/save-slots.mjs'
]);
const contributorSchema={
 type:'object',properties:{
  concrete_action:{type:'string'},
  subsystem_contract:{type:'string'},
  regression_risk:{type:'string'}
 },
 required:['concrete_action','subsystem_contract','regression_risk'],additionalProperties:false
};
const draftSchema={
 type:'object',properties:{
  summary:{type:'string'},
  changes:{type:'array',items:{type:'object',properties:{
   path:{type:'string'},content:{type:'string'}
  },required:['path','content'],additionalProperties:false}},
  tests:{type:'array',items:{type:'string'}},
  risks:{type:'array',items:{type:'string'}}
 },required:['summary','changes','tests','risks'],additionalProperties:false
};
const reviewSchema={
 type:'object',properties:{
  approved:{type:'boolean'},
  concerns:{type:'array',items:{type:'string'}},
  missing_tests:{type:'array',items:{type:'string'}}
 },required:['approved','concerns','missing_tests'],additionalProperties:false
};
const read=(path,max=18000)=>existsSync(path)?readFileSync(path,'utf8').slice(0,max):'';
const sourcePaths=[
 'game/main.mjs','game/missions/jobs.mjs','game/simulation/burner.mjs',
 'game/world/industrial-yard.mjs','game/player/platformer.mjs',
 'game/core/clocks.mjs','game/index.html','game/style.css'
];
export function validateCouncil(crew,contributions){
 if(crew.length!==ROLE_COUNT||new Set(crew.map(c=>c.id)).size!==ROLE_COUNT)
  throw Error('council registry must have 25 distinct roles');
 if(contributions.length!==ROLE_COUNT||new Set(contributions.map(c=>c.role)).size!==ROLE_COUNT)
  throw Error('not all 25 role sessions completed');
 for(const entry of contributions){
  if(!crew.some(role=>role.id===entry.role))throw Error('unrecognized contribution '+entry.role);
  for(const key of ['concrete_action','subsystem_contract','regression_risk']){
   if(typeof entry[key]!=='string'||entry[key].trim().length<15)
    throw Error('empty or decorative council contribution '+entry.role+':'+key);
  }
 }
 return true;
}
export function validateIntegratedFiles(implementation){
 const actual=implementation?.changes?.map(x=>x.path);
 if(!Array.isArray(actual)||actual.length!==REQUIRED_FILES.length||
   new Set(actual).size!==REQUIRED_FILES.length||
   REQUIRED_FILES.some(p=>!actual.includes(p)))
  throw Error('a coherent four-module Pass Two implementation is required');
 return true;
}
const writeJson=(path,value)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');};

export async function runCouncilWave(orderPath,outPath='artifacts/ice-proposal.json',{
 fetchImpl=fetch,reportPath='artifacts/ice-spend-report.json',
 councilPath='artifacts/ice-council-report.json',
 rejectedPath='artifacts/ice-rejected-candidate.json'
}={}){
 const order=JSON.parse(readFileSync(orderPath,'utf8'));
 validateWorkOrder(order);
 if(order.id!=='ICE-P2-COUNCIL-01'||order.role!=='integrator'||order.target_file)
  throw Error('unapproved council work order');
 if(process.env.ICE_STUDIO_ENABLED!=='true')throw Error('paid studio disabled');
 const runId=String(process.env.GITHUB_RUN_ID??'');
 if(!/^\d+$/.test(runId))throw Error('missing GitHub run identifier');
 const crew=getCrew();
 if(crew.length!==ROLE_COUNT)throw Error('the complete studio is not registered');
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw Error('OPENAI_API_KEY missing');
 const budget=new ModelBudget(Math.min(order.max_cost_usd,2));
 const sourceSha=process.env.GITHUB_SHA;
 const shared={
  wave:'Pass Two — The Operator',
  goal:order.goal,acceptance:order.acceptance,
  canon:read('design/game-bible.md',5200),
  passTwo:read('design/pass-two-operator.md',4700),
  warnings:'Do not imply all 25 agents are simultaneously working. This is one on-demand source-grounded sequential production wave. No auto merge. No costs beyond the ledger reservation.'
 };
 const contributions=[];let rejectedCandidate=null,review=null,status='failed';
 const artifacts={runId,sourceSha,orderId:order.id,contributions,implementation:null};
 try{
  // Every role receives specific existing source contracts. A role's advice is not
  // a file edit, so its write ownership is never silently bypassed.
  for(const role of crew){
   const inputPaths=[...new Set([...role.profile.critical_inputs, ...sourcePaths.slice(0,2)])]
    .filter(p=>/^(?:game|design|content|tests|assets|memory)\/[a-zA-Z0-9_./-]+$/.test(p)&&!p.includes('..'))
    .slice(0,5);
   const sources=inputPaths.map(path=>({path,content:read(path,3700)})).filter(f=>f.content);
   const advice=await callStructured({
    key,model:'gpt-6-luna',step:'council_'+role.id,
    instructions:role.profile.system_instructions+
     ' Your job is a concrete department handoff for one FOUR-file integrated Pass Two build, not inspirational commentary. Identify a specific implementation action, a required cross-file interface and a reproducible risk. Stay inside the published game vision. Your recommendation will be recorded as evidence; do not claim to have executed code.',
    input:JSON.stringify({role:role.id,department:role.department,shared,sources}),
    schema:contributorSchema,name:'ice_council_contribution',max_output_tokens:950,budget,fetchImpl
   });
   contributions.push({role:role.id,...advice});
   validateCouncilPartial(contributions);
   // Preserve partial contributions if a later role fails or the budget is exhausted.
   writeJson(councilPath,{...artifacts,contributions,completed:contributions.length,total:ROLE_COUNT});
   console.log('COUNCIL ROLE '+contributions.length+'/'+ROLE_COUNT+' '+role.id);
  }
  validateCouncil(crew,contributions);
  const existing=sourcePaths.map(path=>({path,content:read(path,path==='game/world/industrial-yard.mjs'?23000:42000)}));
  const brief={shared,contributions,existing,requiredFiles:REQUIRED_FILES,
   sourceSha,requirements:[
    'Produce EXACTLY four complete UTF-8 files, with the exact paths in requiredFiles, no more and no fewer. No changes to CSS, HTML, tests or studio.',
    'Original game/main.mjs is the baseline. Preserve world rendering, clocks, mobile joystick, fullscreen, touch jumps, accessibility, audio and ignition. Never remove existing code solely to fit token limits.',
    'Import and USE both new operator and persistence modules from game/main.mjs; save actual gameplay state, not an unused data model.',
    'Keep current Job IDs and player routes; add distinct physical industrial task logic, meaningful warnings, failure consequence and success payout.',
    'Provide a robust versioned three-slot save/autosave with backup and corrupt recovery. Never trust device clock as authoritative.',
    'NPC must offer actual stateful gameplay choices/hints/requests without making a contract impossible. Keep intro primarily iconographic.',
    'Avoid invented hardware precision. Burner remains a simplified causal simulation; do not modify its authoritative math.'
   ]};
  const integrator=crew.find(c=>c.id==='integrator');
  let implementation=await callStructured({
   key,model:'gpt-6.1-terra',step:'council_integrator',
   instructions:integrator.profile.system_instructions+
    ' Act as the chief engineering integrator of 25 named department handoffs. Build the actual coherent playable four-file Pass Two source patch. Do not merely describe it. Preserve all preexisting functionality and code interfaces. Each change is a complete file, not a diff. This credentialed job never executes your code.',
   input:JSON.stringify(brief),schema:draftSchema,name:'ice_council_build',
   max_output_tokens:17500,budget,fetchImpl
  });
  const qa=crew.find(c=>c.id==='qa_architect');
  for(let correction=0;correction<=1;correction++){
   const candidate={schemaVersion:1,orderId:order.id,runId,role:'integrator',
    sourceSha,summary:implementation.summary,
    changes:implementation.changes,tests:implementation.tests,risks:implementation.risks,
    council:contributions,costUsd:0,modelAudit:[]};
   rejectedCandidate=candidate;
   let structureProblem='';
   try{validateIntegratedFiles(implementation);validateProposal(candidate,order);}
   catch(e){structureProblem=String(e.message).slice(0,500);}
   review=structureProblem?{approved:false,concerns:[structureProblem],missing_tests:[]}
    :await callStructured({
     key,model:'gpt-6-luna',step:'council_independent_qa_'+correction,
     instructions:qa.profile.system_instructions+
      ' You are hostile pre-execution SOURCE QA. Verify the full source really implements connected NPC+three-slot save+distinct missions, retains full traversal, HUD, audio, close-up flame, and passes imports/contracts. Reject cosmetic-only or unconnected scaffolding. Actual code execution happens in a no-secret job after your approval; do not pretend tests were run here.',
     input:JSON.stringify({acceptance:order.acceptance,sourceSha,changes:implementation.changes,
      councilHandoffs:contributions.map(c=>({role:c.role,contract:c.subsystem_contract})),
      baseline:existing.filter(x=>x.path==='game/main.mjs'||x.path==='game/missions/jobs.mjs'),
      pendingQA:['npm test','Chrome mobile touch smoke','pass-two-council acceptance']}),
     schema:reviewSchema,name:'ice_council_qa',max_output_tokens:2100,budget,fetchImpl
    });
   if(review.approved){
    candidate.review=review;candidate.costUsd=Number(budget.spent.toFixed(7));candidate.modelAudit=budget.calls;
    candidate.councilSize=contributions.length;candidate.correctionCount=correction;
    writeJson(outPath,candidate);
    status='accepted';artifacts.implementation={summary:candidate.summary,changes:candidate.changes.map(c=>c.path)};
    writeJson(councilPath,{...artifacts,completed:ROLE_COUNT,total:ROLE_COUNT,status,
     costUsd:budget.spent,modelAudit:budget.calls});
    console.log('25-ROLE COUNCIL ACCEPTED: '+candidate.changes.map(c=>c.path).join(',')+
     ' costUsd='+candidate.costUsd);
    return candidate;
   }
   if(correction===1)throw Error('source QA rejected the integrated Pass Two candidate: '+review.concerns.join('; ').slice(0,500));
   implementation=await callStructured({
    key,model:'gpt-6.1-terra',step:'council_integrator_repair',
    instructions:integrator.profile.system_instructions+
     ' Fix every independent QA defect while keeping the entire original source behavior. Return FOUR full complete files, same exact required paths. No more files, no omissions. No CI edits.',
    input:JSON.stringify({brief,previous:implementation,review,sourceSha}),
    schema:draftSchema,name:'ice_council_corrected_build',
    max_output_tokens:17500,budget,fetchImpl
   });
  }
  throw Error('unreachable');
 }catch(error){
  if(rejectedCandidate)writeJson(rejectedPath,{runId,orderId:order.id,candidate:rejectedCandidate,
   review,reason:String(error.message).slice(0,900)});
  writeJson(councilPath,{...artifacts,completed:contributions.length,total:ROLE_COUNT,status:'failed',
   reason:String(error.message).slice(0,900)});
  throw error;
 }finally{
  writeJson(reportPath,{runId,orderId:order.id,status,
   billingComplete:budget.accountingCertain,
   costUsd:Number(budget.spent.toFixed(7)),modelAudit:budget.calls});
 }
}
function validateCouncilPartial(contributions){
 const last=contributions.at(-1);
 if(!last?.role||new Set(contributions.map(c=>c.role)).size!==contributions.length)
  throw Error('duplicate or invalid council role');
 for(const field of ['concrete_action','subsystem_contract','regression_risk'])
  if(typeof last[field]!=='string'||last[field].trim().length<15)
   throw Error('insubstantial handoff from '+last.role+': '+field);
}
if(process.argv[1]&&process.argv[1].endsWith('/council-wave.mjs')){
 await runCouncilWave(process.argv[2],process.argv[3]);
}
