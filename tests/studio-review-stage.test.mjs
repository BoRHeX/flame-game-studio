import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runSession} from '../studio/runtime/runner.mjs';
test('source review describes mandatory downstream execution without claiming it already happened',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'ice-source-review-stage-'));
 const keys=['ICE_STUDIO_ENABLED','GITHUB_RUN_ID','OPENAI_API_KEY'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{ICE_STUDIO_ENABLED:'true',GITHUB_RUN_ID:'90129',OPENAI_API_KEY:'fixture-only'});
 const outputs=[{summary:'plan',steps:['preserve contracts'],contracts:[]},
  {summary:'candidate',content:readFileSync('game/chambers/flow.mjs','utf8'),tests:['Pending independent execution'],risks:[]},
  {approved:true,concerns:[],missing_tests:[]}];
 let index=0,reviewRequest;
 const mock=async(_url,options)=>{
  const body=JSON.parse(options.body);if(index===2)reviewRequest=body;
  const output=outputs[index++];
  return {ok:true,status:200,json:async()=>({status:'completed',
   usage:{input_tokens:100,output_tokens:50,input_tokens_details:{cached_tokens:0}},
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]})};
 };
 try{
  await runSession('studio/work-orders/ice-chamber-flow-output-01.json',join(temp,'proposal.json'),
   {fetchImpl:mock,reportPath:join(temp,'spend.json')});
  const input=JSON.parse(reviewRequest.input);
  assert.equal(input.verification.stage,'pre_execution_source_review');
  assert.equal(input.verification.testsExecuted,false);
  assert.equal(input.verification.generatedCodeExecutionAllowed,false);
  assert.equal(input.verification.requiredBefore,'draft PR creation');
  assert.ok(input.verification.pendingChecks.includes('mobile Chrome smoke'));
  assert.ok(input.verification.pendingChecks.includes('studio/acceptance/chamber-flow-output.mjs'));
  assert.match(reviewRequest.instructions,/not release approval/i);
  assert.match(reviewRequest.instructions,/must pass before any PR is created/);
 }finally{
  for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  rmSync(temp,{recursive:true,force:true});
 }
});
