import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveInMemory,settleInMemory} from '../studio/budget/ledger.mjs';
import {canInvokePaid} from '../studio/budget/guards.mjs';
const on={STUDIO_ENABLED:true,ENFORCEMENT_IMPLEMENTED:true,DURABLE_LEDGER_ENABLED:true,
 MAX_RUN_COST_USD:2,MAX_DAILY_COST_USD:5,INITIAL_EXPERIMENT_CAP_USD:50};
const empty={version:1,entries:[]},day='2026-11-11';
test('budget refuses start unless all enforcement flags are active',()=>{
 assert.equal(canInvokePaid({...on,STUDIO_ENABLED:false}),false);
 assert.equal(canInvokePaid(on),true);
 assert.throws(()=>reserveInMemory(empty,{runId:'1',orderId:'x',cap:1,date:day},{...on,STUDIO_ENABLED:false}));
});
test('ledger atomically reserves, settles, and prevents duplicate run spending',()=>{
 const a=reserveInMemory(empty,{runId:'1',orderId:'taskA',cap:1.2,date:day},on);
 assert.equal(a.entries[0].reservedUsd,1.2);
 assert.throws(()=>reserveInMemory(a,{runId:'1',orderId:'taskA',cap:1,date:day},on));
 const b=settleInMemory(a,'1',0.11);
 assert.equal(b.entries[0].status,'settled');
 assert.equal(b.entries[0].actualUsd,0.11);
 assert.throws(()=>settleInMemory(b,'1',0.1));
});
test('budget enforces per-run daily and cumulative limits',()=>{
 assert.throws(()=>reserveInMemory(empty,{runId:'1',orderId:'x',cap:3,date:day},on));
 let s=empty;for(let i=1;i<=2;i++)s=reserveInMemory(s,{runId:String(i),orderId:'x',cap:2,date:day},on);
 assert.throws(()=>reserveInMemory(s,{runId:'3',orderId:'x',cap:2,date:day},on));
 s=reserveInMemory(s,{runId:'3',orderId:'x',cap:1,date:day},on);
 assert.throws(()=>reserveInMemory(s,{runId:'4',orderId:'x',cap:0.2,date:day},on));
 const small={...on,MAX_DAILY_COST_USD:100,INITIAL_EXPERIMENT_CAP_USD:4};
 assert.throws(()=>reserveInMemory(s,{runId:'x',orderId:'x',cap:1,date:'2026-11-12'},small));
});
test('overrun cannot silently refund an inadequate reservation',()=>{
 const s=reserveInMemory(empty,{runId:'1',orderId:'x',cap:1,date:day},on);
 assert.throws(()=>settleInMemory(s,'1',1.01));
});

test('GitHub ledger API reserves and settles with a mocked GitHub token and SHA',async()=>{
 const {reserveGithub,settleGithub}=await import('../studio/budget/ledger.mjs');
 const original=globalThis.fetch;
 const saved=process.env.GITHUB_TOKEN;
 const repo='BoRHeX/flame-game-studio';
 let book={version:1,entries:[]},sha='initial-sha',writes=0;
 process.env.GITHUB_TOKEN='fake-token-for-test-only';
 globalThis.fetch=async(url,options)=>{
  const route=new URL(url);
  assert.equal(route.hostname,'api.github.com');
  assert.equal(options.headers.Authorization,'Bearer fake-token-for-test-only');
  if(route.pathname.endsWith('/git/ref/heads/ice-studio-ledger'))
    return {ok:true,status:200,json:async()=>({object:{sha:'abc123'}})};
  if(route.pathname.endsWith('/contents/studio-spend.json')&&options.method==='GET')
    return {ok:true,status:200,json:async()=>({sha,content:Buffer.from(JSON.stringify(book)).toString('base64')})};
  if(route.pathname.endsWith('/contents/studio-spend.json')&&options.method==='PUT'){
    const payload=JSON.parse(options.body);
    assert.equal(payload.sha,sha);
    assert.equal(payload.branch,'ice-studio-ledger');
    book=JSON.parse(Buffer.from(payload.content,'base64').toString('utf8'));
    sha='next-'+(++writes);
    return {ok:true,status:200,json:async()=>({commit:{sha}})};
  }
  throw Error('Unexpected GitHub API request '+route.pathname+' '+options.method);
 };
 try{
  const reserved=await reserveGithub({repo,runId:'445',orderId:'ICE-FLAME-001',cap:1,now:new Date('2026-11-11T15:30:00Z')});
  assert.equal(reserved.cap,1);
  assert.equal(book.entries[0].status,'reserved');
  const settled=await settleGithub({repo,runId:'445',actualUsd:0.13});
  assert.equal(settled.actualUsd,0.13);
  assert.equal(book.entries[0].status,'settled');
  assert.equal(book.entries[0].actualUsd,0.13);
  assert.equal(writes,2);
 }finally{
  globalThis.fetch=original;
  if(saved===undefined)delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN=saved;
 }
});
test('GitHub ledger stops on upstream HTTP failure without creating a reservation',async()=>{
 const {reserveGithub}=await import('../studio/budget/ledger.mjs');
 const original=globalThis.fetch,saved=process.env.GITHUB_TOKEN;
 process.env.GITHUB_TOKEN='fake-token-for-test-only';
 let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:false,status:403,json:async()=>({message:'insufficient permission'})};};
 try{
  await assert.rejects(
   reserveGithub({repo:'BoRHeX/flame-game-studio',runId:'446',orderId:'ICE-FLAME-001',cap:1}),
   /GitHub budget ledger HTTP 403/
  );
  assert.equal(calls,1);
 }finally{
  globalThis.fetch=original;
  if(saved===undefined)delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN=saved;
 }
});
