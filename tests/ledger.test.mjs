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
