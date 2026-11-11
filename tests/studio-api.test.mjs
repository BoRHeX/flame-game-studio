import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateChange,validateProposal,loadOrder} from '../studio/runtime/proposal.mjs';
import {buildBrief} from '../studio/runtime/brief.mjs';
import {ModelBudget,callStructured,calculateUsageCost} from '../studio/runtime/runner.mjs';
const order=loadOrder('studio/work-orders/ice-flame-polish-01.json');
const sample=(changes)=>({schemaVersion:1,orderId:order.id,runId:'10777',sourceSha:'abc',
 changes,summary:'test',tests:[],risks:[],costUsd:0});
test('old design and visual constitution are explicitly in the scoped brief',()=>{
 const b=buildBrief('studio/work-orders/ice-flame-polish-01.json');
 assert.match(b.visualBrief,/Sweden/);
 assert.match(b.visualBrief,/parallax/i);
 assert.match(b.systemsBrief,/autosave/i);
 assert.equal(b.roleBrief.role,'particle_engineer');
 assert.ok(b.files.some(f=>f.path.includes('particles.mjs')));
});
test('allowed and disallowed patch paths are enforced independently of model JSON',()=>{
 const change={path:'game/flame/new-effect.mjs',content:'export const glow = 1;\n'};
 assert.equal(validateProposal(sample([change]),order)[0].path,change.path);
 const bad=[
  {path:'.github/workflows/attack.yml',content:'x'},
  {path:'studio/runtime/runner.mjs',content:'x'},
  {path:'game/simulation/burner.mjs',content:'x'},
  {path:'game/flame/../../.github/secrets.yml',content:'x'},
  {path:'game/flame/evil.sh',content:'echo hi'},
  {path:'game/flame/.secret.json',content:'{"key":"x"}'}
 ];
 for(const candidate of bad)assert.throws(()=>validateProposal(sample([candidate]),order));
 assert.throws(()=>validateProposal(sample([change,change]),order));
 assert.throws(()=>validateProposal(sample([]),order));
});
test('art and orchestra role ownership matches registered work orders',()=>{
 for(const path of ['studio/work-orders/ice-art-direction-01.json','studio/work-orders/ice-orchestra-01.json']){
  const brief=buildBrief(path);
  assert.ok(brief.order.allowed_paths.length>0);
 }
});
test('provider token estimation is checked before any API request',async()=>{
 const budget=new ModelBudget(.000001);
 let called=false;
 const fakeFetch=()=>{called=true;throw Error('should not fetch');};
 await assert.rejects(callStructured({
  key:'fixture-key',model:'gpt-6.1-terra',step:'test',
  instructions:'Describe the code',input:'long '.repeat(2000),
  schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},
  name:'fixture',max_output_tokens:5000,budget,fetchImpl:fakeFetch
 }),/reserved budget/);
 assert.equal(called,false);
});
test('API response uses structured JSON, counts tokens and never needs live credentials',async()=>{
 const budget=new ModelBudget(1);
 let seenBody=null;
 const mock=async(_url,req)=>{
  seenBody=JSON.parse(req.body);
  return {ok:true,status:200,json:async()=>({
    status:'completed',
    output:[{type:'message',content:[{type:'output_text',text:'{"ok":true}'}]}],
    usage:{input_tokens:100,output_tokens:30,input_tokens_details:{cached_tokens:10}}
  })};
 };
 const answer=await callStructured({key:'dummy-key',model:'gpt-6-luna',
  step:'test',instructions:'test instructions',input:'test input',
  schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false},
  name:'test_output',max_output_tokens:100,budget,fetchImpl:mock});
 assert.equal(answer.ok,true);
 assert.equal(seenBody.store,false);
 assert.equal(seenBody.text.format.type,'json_schema');
 assert.equal(seenBody.text.format.strict,true);
 assert.equal(budget.calls.length,1);
 assert.ok(budget.spent>0);
});
test('model usage with missing token totals fails closed',()=>{
 assert.throws(()=>calculateUsageCost({input_tokens:100},'gpt-6.1-terra'));
});

test('incomplete model response still records billable reasoning tokens',async()=>{
 const budget=new ModelBudget(1);
 let request;
 const fakeFetch=async(_url,opts)=>{
  request=JSON.parse(opts.body);
  return {ok:true,status:200,json:async()=>({
   status:'incomplete',incomplete_details:{reason:'max_output_tokens'},
   output:[{type:'reasoning',summary:[]}],
   usage:{input_tokens:1600,output_tokens:900,
    input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:900}}
  })};
 };
 await assert.rejects(callStructured({
  key:'fixture',model:'gpt-6-luna',step:'producer',
  instructions:'Produce a plan',input:'test input',schema:{
   type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false
  },name:'test_plan',max_output_tokens:3000,budget,fetchImpl:fakeFetch
 }),/incomplete \(max_output_tokens\)/);
 assert.equal(request.reasoning.effort,'low');
 assert.equal(budget.calls.length,1);
 assert.ok(budget.spent>0);
 assert.equal(budget.accountingCertain,true);
});

test('a rejected candidate is corrected once, reviewed independently and accepted',async()=>{
 const {runSession}=await import('../studio/runtime/runner.mjs');
 const {mkdtempSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const temp=mkdtempSync(join(tmpdir(),'ice-review-loop-'));
 const old={ICE_STUDIO_ENABLED:process.env.ICE_STUDIO_ENABLED,
  GITHUB_RUN_ID:process.env.GITHUB_RUN_ID,OPENAI_API_KEY:process.env.OPENAI_API_KEY};
 process.env.ICE_STUDIO_ENABLED='true';process.env.GITHUB_RUN_ID='98765';process.env.OPENAI_API_KEY='dummy-fixture';
 let called=0;
 const plan={summary:'Improve flame',steps:['Improve render'],contracts:['Keep imports valid']};
 const bad={summary:'Unreviewed output',changes:[
  {path:'game/flame/repair-test-fixture.mjs',content:"import {x} from '../chambambers/flow.mjs';\n"}
 ],tests:['test'],risks:[]};
 const good={...bad,summary:'Corrected import',changes:[
  {path:'game/flame/repair-test-fixture.mjs',content:"import {flowAt} from '../chambers/flow.mjs';\nexport {flowAt};\n"}
 ]};
 const responses=[plan,bad,{approved:false,concerns:['Incorrect import path'],missing_tests:[]},
  {summary:'Repair invalid import',steps:['Use actual chamber module'],contracts:['No unverified imports']},
  good,{approved:true,concerns:[],missing_tests:[]}];
 const mock=async()=>{
  const output=responses[called++];
  return {ok:true,status:200,json:async()=>({
   status:'completed',usage:{input_tokens:100,output_tokens:50,
    input_tokens_details:{cached_tokens:0}},
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]
  })};
 };
 try{
  const proposalPath=join(temp,'candidate.json'),reportPath=join(temp,'spend.json');
  const proposal=await runSession('studio/work-orders/ice-flame-polish-01.json',
   proposalPath,{fetchImpl:mock,reportPath});
  assert.equal(called,6);
  assert.equal(proposal.revisions,1);
  assert.equal(proposal.review.approved,true);
  assert.match(proposal.changes[0].content,/chambers\/flow/);
  const report=JSON.parse(readFileSync(reportPath,'utf8'));
  assert.equal(report.status,'accepted');
  assert.equal(report.modelAudit.length,6);
  assert.ok(report.costUsd>0);
 }finally{
  for(const [name,value] of Object.entries(old)){
   if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
test('repeat reviewer rejection fails closed but reconciles all known API usage',async()=>{
 const {runSession}=await import('../studio/runtime/runner.mjs');
 const {mkdtempSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const temp=mkdtempSync(join(tmpdir(),'ice-review-reject-'));
 const old={ICE_STUDIO_ENABLED:process.env.ICE_STUDIO_ENABLED,GITHUB_RUN_ID:process.env.GITHUB_RUN_ID,
  OPENAI_API_KEY:process.env.OPENAI_API_KEY};
 process.env.ICE_STUDIO_ENABLED='true';process.env.GITHUB_RUN_ID='98766';process.env.OPENAI_API_KEY='dummy-fixture';
 let called=0;
 const payload=[
  {summary:'plan',steps:['fix'],contracts:[]},
  {summary:'bad',changes:[{path:'game/flame/review-fixture.mjs',content:'export const test=1;\\n'}],tests:[],risks:[]},
  {approved:false,concerns:['Bad behavior'],missing_tests:[]},
  {summary:'repair 1',steps:['correct behavior'],contracts:[]},
  {summary:'still bad',changes:[{path:'game/flame/review-fixture.mjs',content:'export const test=2;\\n'}],tests:[],risks:[]},
  {approved:false,concerns:['Still bad'],missing_tests:[]},
  {summary:'repair 2',steps:['complete missing checks'],contracts:[]},
  {summary:'still broken',changes:[{path:'game/flame/review-fixture.mjs',content:'export const test=3;\\n'}],tests:[],risks:[]},
  {approved:false,concerns:['Final rejection'],missing_tests:[]}
 ];
 const mock=async()=>{const p=payload[called++];return {ok:true,status:200,json:async()=>({
  status:'completed',usage:{input_tokens:100,output_tokens:60,input_tokens_details:{cached_tokens:0}},
  output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(p)}]}]
 })};};
 try{
  const reportPath=join(temp,'spend.json'),proposalPath=join(temp,'candidate.json');
  await assert.rejects(runSession('studio/work-orders/ice-flame-polish-01.json',
   proposalPath,{fetchImpl:mock,reportPath,rejectedPath:join(temp,'rejected.json')}),/independent review rejected/);
  assert.equal(called,9);
  const report=JSON.parse(readFileSync(reportPath,'utf8'));
  assert.equal(report.status,'failed');assert.equal(report.billingComplete,true);
  assert.equal(report.modelAudit.length,9);assert.ok(report.costUsd>0);
  const rejected=JSON.parse(readFileSync(join(temp,'rejected.json'),'utf8'));
  assert.equal(rejected.candidate.orderId,'ICE-FLAME-001');
  assert.equal(rejected.review.approved,false);
 }finally{
  for(const [name,value] of Object.entries(old)){
   if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
  rmSync(temp,{recursive:true,force:true});
 }
});

test('structurally invalid initial output gets one correction instead of failing immediately',async()=>{
 const {runSession}=await import('../studio/runtime/runner.mjs');
 const {mkdtempSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const temp=mkdtempSync(join(tmpdir(),'ice-shape-repair-'));
 const old={ICE_STUDIO_ENABLED:process.env.ICE_STUDIO_ENABLED,GITHUB_RUN_ID:process.env.GITHUB_RUN_ID,
  OPENAI_API_KEY:process.env.OPENAI_API_KEY};
 process.env.ICE_STUDIO_ENABLED='true';
 process.env.GITHUB_RUN_ID='98767';
 process.env.OPENAI_API_KEY='dummy-test-only';
 let called=0,repairInput;
 const values=[
  {summary:'plan',steps:['improve'],contracts:[]},
  {summary:'invalid',changes:[],tests:[],risks:[]},
  {summary:'Repair structural output',steps:['Return exactly one file'],contracts:['Correct path']},
  {summary:'repaired',changes:[{path:'game/flame/valid-shape-fixture.mjs',
    content:'export const plume=1;\n'}],tests:['unit'],risks:[]},
  {approved:true,concerns:[],missing_tests:[]}
 ];
 const mock=async(_url,options)=>{
  const body=JSON.parse(options.body);
  if(called===3)repairInput=body.input;
  const value=values[called++];
  return {ok:true,status:200,json:async()=>({
   status:'completed',usage:{input_tokens:100,output_tokens:80,input_tokens_details:{cached_tokens:0}},
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]
  })};
 };
 try{
  const file=join(temp,'proposal.json'),report=join(temp,'report.json');
  const result=await runSession('studio/work-orders/ice-flame-polish-01.json',file,
   {fetchImpl:mock,reportPath:report});
  assert.equal(called,5);
  assert.equal(result.revisions,1);
  assert.match(repairInput,/Structural rejection/);
  assert.equal(result.changes.length,1);
  assert.equal(JSON.parse(readFileSync(report,'utf8')).modelAudit.length,5);
 }finally{
  for(const [name,value] of Object.entries(old)){
   if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
