import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBrief} from '../studio/runtime/brief.mjs';
import {readFileSync,existsSync} from 'node:fs';
test('particle expert sees actual read-only flow contracts and incident evidence',()=>{
 const brief=buildBrief('studio/work-orders/ice-flame-root-01.json');
 const paths=brief.readOnlyDependencies.map(d=>d.path);
 for(const p of ['game/chambers/flow.mjs','game/simulation/burner.mjs','tests/game-systems.test.mjs'])
  assert.ok(paths.includes(p),'missing '+p);
 assert.ok(brief.readOnlyDependencies.find(d=>d.path==='game/chambers/flow.mjs').body.includes('flowAt'));
 assert.match(brief.incidentNotes,/spawnRemainder/);
 assert.match(brief.incidentNotes,/chamber geometry/);
});
test('major-build contexts retain complete required source rather than truncating module contracts',()=>{
 for(const path of ['studio/work-orders/major-world-01.json','studio/work-orders/major-platformer-01.json','studio/work-orders/major-integration-01.json']){
  const brief=buildBrief(path);
  for(const file of brief.readOnlyDependencies)assert.equal(file.body,readFileSync(file.path,'utf8'),'complete '+file.path);
  for(const file of [...brief.order.required_contracts,brief.order.verification_script])
   if(existsSync(file))assert.ok(brief.readOnlyDependencies.some(source=>source.path===file),'required '+file);
 }
});

