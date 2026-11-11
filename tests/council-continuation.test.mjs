import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,validateSpecialistStages} from '../studio/runtime/council-continuation.mjs';
import {validateWorkOrder} from '../studio/orchestrator/context.mjs';
import {readFileSync} from 'node:fs';
test('one existing twenty-five-role handoff feeds four named code-owners',()=>{
 assert.equal(STAGES.length,4);
 assert.equal(validateSpecialistStages(),true);
 assert.deepEqual(STAGES.map(s=>s.role),[
  'mission_engineer','npc_engineer','persistence_engineer','integrator']);
 assert.equal(validateSpecialistStages([STAGES[0]]),false);
});
test('bounded continuation work order has the existing trusted integration gate',()=>{
 const o=JSON.parse(readFileSync('studio/work-orders/pass-two-council-continuation-01.json'));
 assert.equal(validateWorkOrder(o).order.id,'ICE-P2-CONT-01');
 assert.equal(o.max_cost_usd,2);
 assert.equal(o.verification_script,'studio/acceptance/pass-two-council.mjs');
});
