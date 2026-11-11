import test from 'node:test';
import assert from 'node:assert/strict';
import {getCrew} from '../studio/orchestrator/roster.mjs';
import {validateCouncil,validateIntegratedFiles,REQUIRED_FILES,ROLE_COUNT} from '../studio/runtime/council-wave.mjs';
import {validateWorkOrder} from '../studio/orchestrator/context.mjs';
import {readFileSync} from 'node:fs';

test('the 25-role council must actually contain 25 distinct role outputs',()=>{
 const crew=getCrew();
 assert.equal(crew.length,ROLE_COUNT);
 const entries=crew.map(c=>({role:c.id,concrete_action:'Implement a meaningful change to the physical world',
  subsystem_contract:'Preserve input and authoritative simulation state',
  regression_risk:'Verify distinct behavior through independent no-secret test'}));
 assert.equal(validateCouncil(crew,entries),true);
 assert.throws(()=>validateCouncil(crew,entries.slice(1)),/not all 25/);
 assert.throws(()=>validateCouncil(crew,[...entries.slice(1),entries[1]]),/not all 25/);
});
test('council output must contain four exact connected game files',()=>{
 assert.equal(validateIntegratedFiles({changes:REQUIRED_FILES.map(path=>({path,content:'test'}))}),true);
 assert.throws(()=>validateIntegratedFiles({changes:[{path:'game/main.mjs'}]}),/four-module/);
});
test('the one-off council task is within integrator scope and capped',()=>{
 const order=JSON.parse(readFileSync('studio/work-orders/pass-two-council-build-01.json','utf8'));
 assert.equal(validateWorkOrder(order).order.id,'ICE-P2-COUNCIL-01');
 assert.equal(order.max_cost_usd,2);
 assert.equal(order.allowed_paths.join(','),'game/');
 assert.ok(order.verification_script);
});
