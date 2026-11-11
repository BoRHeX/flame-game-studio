import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFromDiff,selectOrder} from '../studio/runtime/select-request.mjs';
import {readFileSync} from 'node:fs';
const path='studio/requests/ice-flame-001-003.json';
const good=JSON.stringify({version:1,order:'studio/work-orders/ice-flame-polish-01.json'});
test('one newly added request selects a canonical work order',()=>{
 const selection=selectFromDiff('A\t'+path+'\n',p=>{assert.equal(p,path);return good;});
 assert.equal(selection,'studio/work-orders/ice-flame-polish-01.json');
 assert.equal(selectOrder({event:'push',diff:'A\t'+path+'\n',readRequest:()=>good}),selection);
});
test('updated, multiple, off-directory and malformed requests are refused',()=>{
 const invalid=[
  ['M\t'+path+'\n',good],['D\t'+path+'\n',good],
  ['A\t'+path+'\nA\tREADME.md\n',good],
  ['A\tREADME.md\n',good],
  ['A\tstudio/requests/../evil.json\n',good],
  ['A\t'+path+'\n',JSON.stringify({version:1,order:'../.github/workflows/test.yml'})],
  ['A\t'+path+'\n',JSON.stringify({version:1,order:'studio/work-orders/ice-flame-polish-01.json',costOverride:100})],
  ['A\t'+path+'\n',JSON.stringify({version:2,order:'studio/work-orders/ice-flame-polish-01.json'})]
 ];
 for(const [diff,body] of invalid)assert.throws(()=>selectFromDiff(diff,()=>body));
});
test('manual dispatch remains supported without introducing other events',()=>{
 assert.equal(selectOrder({event:'workflow_dispatch',manualOrder:'studio/work-orders/ice-flame-polish-01.json'}),
 'studio/work-orders/ice-flame-polish-01.json');
 assert.throws(()=>selectOrder({event:'schedule',manualOrder:'studio/work-orders/ice-flame-polish-01.json'}));
 assert.throws(()=>selectOrder({event:'workflow_dispatch',manualOrder:'.github/secrets.yml'}));
});
test('all known work orders remain valid bounded tasks',async()=>{
 const {validateWorkOrder}=await import('../studio/orchestrator/context.mjs');
 for(const path of ['studio/work-orders/ice-flame-polish-01.json',
  'studio/work-orders/ice-orchestra-01.json','studio/work-orders/ice-art-direction-01.json']){
  const spec=JSON.parse(readFileSync(path,'utf8'));
  assert.ok(validateWorkOrder(spec).role.id);
  assert.ok(spec.max_cost_usd<=2);
 }
});
