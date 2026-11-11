import test from 'node:test';
import assert from 'node:assert/strict';
import {compileBrief,validateWorkOrder} from '../studio/orchestrator/context.mjs';
import {dollarsForTokens,assertWithinCap,canInvokePaid} from '../studio/budget/guards.mjs';
import {readFileSync} from 'node:fs';
const order=JSON.parse(readFileSync(new URL('../studio/work-orders/flame-lab-renderer.json',import.meta.url)));
const policy=JSON.parse(readFileSync(new URL('../studio/budget/policy.json',import.meta.url)));
test('known scoped renderer task produces small canonical brief but never calls LLM',()=>{
 const brief=compileBrief(order);
 assert.equal(brief.agent_invocation_enabled,false);
 assert.equal(brief.canon.world_fps,18);
 assert.deepEqual(brief.allowed_paths,['game/flame/']);
});
test('protected path, traversal, invented roles and unknown fields fail closed',()=>{
 const withChange=(patch)=>({...order,...patch});
 assert.throws(()=>validateWorkOrder(withChange({allowed_paths:['../secrets']})));
 assert.throws(()=>validateWorkOrder(withChange({allowed_paths:['memory/canonical/']})));
 assert.throws(()=>validateWorkOrder(withChange({allowed_paths:['game/simulation/']})));
 assert.throws(()=>validateWorkOrder(withChange({role:'imaginary_council'})));
 assert.throws(()=>validateWorkOrder(withChange({budget_waiver:true})));
});
test('budget calculation accounts for cached tokens and refuses overruns',()=>{
 const price={inputPerMillion:2,cachedInputPerMillion:.2,outputPerMillion:10};
 const estimate=dollarsForTokens({input:1000000,cached:500000,output:100000},price);
 assert.ok(Math.abs(estimate-2.1)<1e-9);
 assert.equal(assertWithinCap(estimate,3),true);
 assert.throws(()=>assertWithinCap(estimate,2));
 assert.throws(()=>dollarsForTokens({input:100,cached:101,output:0},price));
});
test('local budget policy cannot activate paid workers',()=>{
 assert.equal(canInvokePaid(policy),false);
 assert.equal(canInvokePaid({...policy,STUDIO_ENABLED:true,DURABLE_LEDGER_ENABLED:false}),false);
});
