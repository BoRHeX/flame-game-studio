import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {productPath,applyEdits,validateJob,validateCandidate,packageHash,selectJob,save,json,pickAttempt} from '../studio/production/protocol.mjs';
import {generate,assess,ask,restoreBudget} from '../studio/production/worker.mjs';
import {publishVerified} from '../studio/production/controller.mjs';
import {verify} from '../studio/production/verify.mjs';
const job={version:1,id:'ICE-AUTONOMY-TEST',goal:'Build a connected, visibly different playable game production feature.',acceptance:['A coherent result'],max_cost_usd:2,max_attempts:3,references:[],quality:{}};
const candidate=files=>({version:1,jobId:job.id,runId:'123',sourceSha:'abc',attempt:0,files,handoffs:[]});

test('production permits coordinated changes across departments while protecting controls and credentials',()=>{
 const initial=new Map([['game/a.mjs','export const n=1;'],['game/b.mjs','import {n} from "./a.mjs";export const value=n;']]);
 const changed=applyEdits(initial,[{path:'game/a.mjs',operation:'replace',find:'n=1',content:'n=2'},
  {path:'game/b.mjs',operation:'write',find:'',content:'import {n} from "./a.mjs";export const value=n*2;'},
  {path:'game/assets/operator.svg',operation:'write',find:'',content:'<svg xmlns="http://www.w3.org/2000/svg"/>'}]);
 assert.equal(changed.size,3);assert.equal(initial.get('game/a.mjs'),'export const n=1;');
 for(const path of ['studio/budget/policy.json','.github/workflows/a.yml','game/../studio/key.mjs','game/.env','tests/ledger.test.mjs','/game/x.mjs'])assert.throws(()=>productPath(path));
 assert.throws(()=>applyEdits(initial,[{path:'game/a.mjs',operation:'replace',find:'missing',content:'x'}]));
 const p=candidate([...changed].map(([path,content])=>({path,content})));assert.equal(validateCandidate(p,job,'abc','123'),packageHash(p));
 assert.throws(()=>validateCandidate({...p,sourceSha:'different'},job,'abc','123'));
});

test('one production request selects one complete bounded job',()=>{
 const read=p=>p.endsWith('/request.json')?JSON.stringify({version:1,job:'studio/production/jobs/game.json'}):JSON.stringify(job);
 assert.equal(selectJob('A\tstudio/production/requests/request.json',read),'studio/production/jobs/game.json');
 assert.throws(()=>selectJob('M\tstudio/production/requests/request.json',read));
 assert.throws(()=>selectJob('A\tstudio/production/requests/request.json\nA\tgame/a.mjs',read));
 assert.throws(()=>validateJob({...job,max_attempts:99}));assert.throws(()=>validateJob({...job,max_cost_usd:200}));
});

function fakeModel(outputs,seen=[]){return async(url,request)=>{
 const body=JSON.parse(request.body);seen.push(body);const next=outputs.shift();if(!next)throw Error('Unexpected provider call');
 return {ok:true,json:async()=>({status:'completed',usage:{input_tokens:100,output_tokens:20},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(next)}]}]})};};}

test('one brief drives shared implementation, real failure feedback, repair and independent acceptance',async()=>{
 const root=mkdtempSync(join(tmpdir(),'ice-production-')),oldCwd=process.cwd();
 const oldEnv={key:process.env.OPENAI_API_KEY,run:process.env.GITHUB_RUN_ID,sha:process.env.GITHUB_SHA,enabled:process.env.ICE_STUDIO_ENABLED};
 try{
  process.chdir(root);mkdirSync('game',{recursive:true});mkdirSync('design');mkdirSync('out');
  writeFileSync('design/game-bible.md','Flame causality and a playable industrial game.');writeFileSync('game/index.html','<head></head>');writeFileSync('game/a.mjs','export const n=1;');save('job.json',job);
  Object.assign(process.env,{OPENAI_API_KEY:'test-key',GITHUB_RUN_ID:'123',GITHUB_SHA:'abc',ICE_STUDIO_ENABLED:'true'});
  const seen=[],model=fakeModel([
   {vision:'Connected production',team:[{role:'environment_animator',goal:'Build the world'}],acceptance:['Connected consumers']},
   {summary:'Authored module',edits:[{path:'game/a.mjs',operation:'replace',find:'n=1',content:'n=2'}],handoff:'n is now 2'},
   {summary:'Connected consumer',edits:[{path:'game/b.mjs',operation:'write',find:'',content:'import {n} from "./a.mjs";export const value=n*2;'}],handoff:'Complete connected game code'}],seen);
  const p=await generate('job.json',0,'out',null,{fetchImpl:model});
  assert.equal(p.handoffs.length,2);assert.ok(seen[2].input.includes('n=2'),'integrator sees the actual prior contribution');
  assert.ok(readFileSync('game/a.mjs','utf8').includes('n=1'),'credentialed worker has not executed/applied its code');
  save('out/verification.json',{passed:false,failures:['Real test: expected value 6, got 4'],checks:[]});
  const failed=await assess('job.json',0,'out',{fetchImpl:()=>{throw Error('No vision call on failing executable checks');}});
  assert.equal(failed.passed,false);assert.equal(failed.retryable,true);
  const repaired=await generate('job.json',1,'repaired','out',{fetchImpl:fakeModel([{summary:'Fixed coherent consumer',edits:[{path:'game/b.mjs',operation:'replace',find:'n*2',content:'n*3'}],handoff:'Actual failure fixed'}])});
  const current=new Map([['game/a.mjs','export const n=1;']]);for(const f of repaired.files)current.set(f.path,f.content);
  for(const [path,content] of current){mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,content);}
  assert.equal(execFileSync(process.execPath,['--input-type=module','-e','import {value} from "./game/b.mjs";console.log(value)'],{encoding:'utf8'}).trim(),'6');
  save('repaired/verification.json',{passed:true,packageHash:packageHash(repaired),checks:[{name:'actual execution',passed:true}],failures:[]});
  const missing=await assess('job.json',1,'repaired',{fetchImpl:()=>{throw Error('Cannot review absent images');}});
  assert.equal(missing.passed,false);assert.match(missing.error,/visual evidence is missing/);
  mkdirSync('repaired/screens');for(const name of ['mobile-world.jpg','production-backyard.jpg'])writeFileSync('repaired/screens/'+name,Buffer.from([255,216,255,217,0]));
  const accepted=await assess('job.json',1,'repaired',{fetchImpl:fakeModel([{approved:true,visible_progress:true,findings:['Verified substantial result'],repair_brief:''}])});
  assert.equal(accepted.passed,true);assert.ok(json('repaired/spend.json').modelAudit.length>json('out/spend.json').modelAudit.length,'all attempts share cumulative usage');
  assert.equal(pickAttempt(['out','repaired'],'123').dir,'repaired');
 }finally{
  process.chdir(oldCwd);for(const [name,value] of Object.entries({OPENAI_API_KEY:oldEnv.key,GITHUB_RUN_ID:oldEnv.run,GITHUB_SHA:oldEnv.sha,ICE_STUDIO_ENABLED:oldEnv.enabled}))value===undefined?delete process.env[name]:process.env[name]=value;
  rmSync(root,{recursive:true,force:true});
 }
});

test('publisher promotes only the tested package and rejects stale or forged evidence',async()=>{
 const old=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try{
  const p=candidate([{path:'game/a.mjs',content:'export const n=2;'}]),hash=packageHash(p);
  const assessment={passed:true,attempt:0,runId:'123',jobId:job.id,sourceSha:'abc',packageHash:hash,verification:{passed:true,packageHash:hash,checks:[{name:'unit + actual Chrome',passed:true}]},verdict:{approved:true,visible_progress:true,findings:['Substantial visible progress']}};
  const calls=[],api=async(path,options={})=>{calls.push({path,...options});
   if(path.endsWith('/git/ref/heads/main'))return {object:{sha:'abc'}};
   if(path.endsWith('/git/commits/abc'))return {tree:{sha:'base-tree'}};
   if(path.endsWith('/git/trees'))return {sha:'new-tree'};
   if(path.endsWith('/git/commits'))return {sha:'new-commit'};
   if(path.endsWith('/pulls'))return {number:45,html_url:'https://github.com/example/game/pull/45'};
   return {};};
  const r=await publishVerified({job,candidate:p,assessment,repo:'example/game',runId:'123',sourceSha:'abc',api});
  assert.equal(r.mergeSha,'new-commit');assert.deepEqual(calls.at(-1).body,{sha:'new-commit',force:false});
  await assert.rejects(()=>publishVerified({job,candidate:p,assessment:{...assessment,packageHash:'forged'},repo:'example/game',runId:'123',sourceSha:'abc',api}),/attestation/);
  await assert.rejects(()=>publishVerified({job,candidate:p,assessment,repo:'example/game',runId:'123',sourceSha:'abc',api:async()=>({object:{sha:'someone-elses-work'}})}),/STALE_BASE/);
  await assert.rejects(()=>publishVerified({job,candidate:p,assessment:{...assessment,verdict:{...assessment.verdict,visible_progress:false}},repo:'example/game',runId:'123',sourceSha:'abc',api}),/attestation/);
 }finally{if(old!==undefined)process.env.OPENAI_API_KEY=old;}
});

test('unknown model usage cannot silently create a fresh allowance',()=>{
 assert.throws(()=>restoreBudget(2,{billingComplete:false,modelAudit:[],costUsd:0}),/unknown/);
 assert.throws(()=>restoreBudget(2,{billingComplete:true,modelAudit:[],costUsd:1}),/spend report/);
});

test('executable verification rejects provider keys and source modified during tests',()=>{
 const root=mkdtempSync(join(tmpdir(),'ice-verifier-')),cwd=process.cwd();
 const previous={key:process.env.OPENAI_API_KEY,sha:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID};
 try{
  process.chdir(root);mkdirSync('game');writeFileSync('game/a.mjs','export const n=1;');save('job.json',job);
  process.env.GITHUB_RUN_ID='123';process.env.GITHUB_SHA='abc';process.env.OPENAI_API_KEY='test-key';
  const blocked=verify('job.json',0,'blocked',{runCommand:()=>{throw Error('Must not execute with a model key');}});
  assert.equal(blocked.passed,false);assert.match(blocked.failures.join(' '),/credentials are forbidden/);
  delete process.env.OPENAI_API_KEY;mkdirSync('out');save('out/candidate.json',candidate([{path:'game/a.mjs',content:'export const n=2;'}]));
  const result=verify('job.json',0,'out',{runCommand:(exe,args)=>{
   if(args.includes('-e'))return {passed:true,log:'{}'};
   if(exe==='npm')writeFileSync('game/a.mjs','export const n=999;');
   return {passed:true,log:'simulated isolated command'};
  }});
  assert.equal(result.passed,false);assert.match(result.failures.join(' '),/source changed during/);
 }finally{
  process.chdir(cwd);for(const [k,v] of Object.entries({OPENAI_API_KEY:previous.key,GITHUB_SHA:previous.sha,GITHUB_RUN_ID:previous.run}))v===undefined?delete process.env[k]:process.env[k]=v;
  rmSync(root,{recursive:true,force:true});
 }
});
