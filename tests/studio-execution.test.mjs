import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildBrief} from '../studio/runtime/brief.mjs';
import {runSession} from '../studio/runtime/runner.mjs';
import {validateWorkOrder} from '../studio/orchestrator/context.mjs';
import {runAcceptance} from '../studio/runtime/acceptance-cli.mjs';
const path='studio/work-orders/ice-chamber-flow-output-01.json';
const order=JSON.parse(readFileSync(path,'utf8'));

test('dry-run compilation stays inert while paid brief reports the actual proposal mode',()=>{
 const dry=buildBrief(path),paid=buildBrief(path,{executionMode:'paid_proposal'});
 assert.equal(dry.roleBrief.status,'DRY_RUN_ONLY');
 assert.equal(dry.execution.proposal_generation_authorized,false);
 assert.equal(paid.roleBrief.status,'PAID_PROPOSAL');
 assert.equal(paid.roleBrief.agent_invocation_enabled,true);
 assert.equal(paid.execution.proposal_generation_authorized,true);
 assert.equal(paid.execution.generated_code_execution_authorized,false);
 assert.equal(paid.execution.automatic_merge_authorized,false);
 assert.ok(paid.activeDecisions.some(d=>d.path.includes('ADR-0002')));
 assert.ok(paid.readOnlyDependencies.some(d=>d.path===order.verification_script));
 assert.match(paid.instruction,/active work order defines/i);
 assert.throws(()=>buildBrief(path,{executionMode:'unlimited'}));
});

test('guarded model session sends active execution and technical decisions to every stage',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'ice-execution-context-'));
 const names=['ICE_STUDIO_ENABLED','GITHUB_RUN_ID','OPENAI_API_KEY'];
 const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 Object.assign(process.env,{ICE_STUDIO_ENABLED:'true',GITHUB_RUN_ID:'90876',OPENAI_API_KEY:'fixture-only'});
 const plan={summary:'Implement approved flow adapter',steps:['Reuse output'],contracts:['ADR-0002']};
 const candidate={summary:'Reusable flow vector',content:readFileSync(order.target_file,'utf8'),tests:['Trusted acceptance will run in QA'],risks:[]};
 const outputs=[plan,candidate,{approved:false,concerns:['Check reusable output'],missing_tests:[]},
  plan,candidate,{approved:true,concerns:[],missing_tests:[]}];
 const requests=[];
 const mock=async(_url,options)=>{
  requests.push(JSON.parse(options.body));
  const value=outputs[requests.length-1];
  return {ok:true,status:200,json:async()=>({status:'completed',
   usage:{input_tokens:100,output_tokens:50,input_tokens_details:{cached_tokens:0}},
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
 };
 try{
  const result=await runSession(path,join(temp,'proposal.json'),{fetchImpl:mock,reportPath:join(temp,'spend.json')});
  assert.equal(result.revisions,1);
  assert.equal(requests.length,6);
  for(const request of requests){
   const input=JSON.parse(request.input);
   const context=input.brief??input;
   assert.equal(context.execution.mode,'paid_proposal');
   assert.ok(context.activeDecisions.some(d=>d.path.includes('ADR-0002')));
   assert.doesNotMatch(request.input,/"status":"DRY_RUN_ONLY"/);
  }
 }finally{
  for(const [name,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
  rmSync(temp,{recursive:true,force:true});
 }
});

test('work orders may select only an existing protected acceptance script',()=>{
 validateWorkOrder(order);
 for(const verification_script of ['studio/runtime/runner.mjs','../evil.mjs',
  'studio/acceptance/not-present.mjs','studio/acceptance/../runtime/runner.mjs'])
  assert.throws(()=>validateWorkOrder({...order,verification_script}));
});

test('acceptance dispatch propagates failure and refuses model credentials',()=>{
 const saved=process.env.OPENAI_API_KEY;
 delete process.env.OPENAI_API_KEY;
 let invocation;
 try{
  runAcceptance(path,{spawnImpl:(exe,args,options)=>{invocation={exe,args,options};return {status:0};}});
  assert.deepEqual(invocation.args,[order.verification_script]);
  assert.equal(invocation.options.shell,false);
  assert.throws(()=>runAcceptance(path,{spawnImpl:()=>({status:1})}),/acceptance failed/);
  process.env.OPENAI_API_KEY='must-not-be-present';
  assert.throws(()=>runAcceptance(path),/must not receive model credentials/);
 }finally{
  if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;
 }
});
