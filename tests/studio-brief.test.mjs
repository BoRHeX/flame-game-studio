import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBrief} from '../studio/runtime/brief.mjs';
test('particle expert sees actual read-only flow contracts and incident evidence',()=>{
 const brief=buildBrief('studio/work-orders/ice-flame-root-01.json');
 const paths=brief.readOnlyDependencies.map(d=>d.path);
 for(const p of ['game/chambers/flow.mjs','game/simulation/burner.mjs','tests/game-systems.test.mjs'])
  assert.ok(paths.includes(p),'missing '+p);
 assert.ok(brief.readOnlyDependencies.find(d=>d.path==='game/chambers/flow.mjs').body.includes('flowAt'));
 assert.match(brief.incidentNotes,/spawnRemainder/);
 assert.match(brief.incidentNotes,/chamber geometry/);
});
