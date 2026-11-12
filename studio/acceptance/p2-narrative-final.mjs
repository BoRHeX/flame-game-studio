import assert from 'node:assert/strict';
import {StoryState} from '../../game/narrative/story-flags.mjs';
const s=new StoryState();s.record('meet');s.record('diagnose');s.record('complete','backyard');s.record('complete','backyard');
assert.equal(s.snapshot().flags.metOperator,true);assert.equal(s.snapshot().flags.backyardComplete,true);assert.equal(s.snapshot().flags.warehouseComplete,false);
const copy=s.snapshot();copy.flags.metOperator=false;assert.equal(s.snapshot().flags.metOperator,true);
assert.deepEqual(new StoryState(s.snapshot()).snapshot(),s.snapshot());
const before=s.snapshot();s.record('complete','unknown');assert.deepEqual(s.snapshot(),before,'unknown contracts grant no story progression');
s.record('assist','warehouse');assert.equal(s.snapshot().choice,'assisted');assert.equal(s.snapshot().flags.assisted,true);
for(const jobId of [null,'backyard','warehouse','heat-hold']){const d=s.dialogue({jobId,mainLit:false,damperRepaired:false});assert.equal(typeof d.icon,'string');assert.ok(d.text.length>8);assert.ok(d.options.length>=2&&d.options.length<=3);assert.ok(d.options.every(o=>['diagnose','assist','independent','leave'].includes(o.id)&&o.text&&o.icon));}
assert.notDeepEqual(s.dialogue({jobId:'warehouse',mainLit:false,damperRepaired:false}),s.dialogue({jobId:'warehouse',mainLit:true,damperRepaired:true}),'dialogue reflects actual repair/process');
assert.equal(new StoryState({version:99,flags:{warehouseComplete:true}}).snapshot().flags.warehouseComplete,false);
console.log('PASS P2 NARRATIVE: persistent branches, mission consequences and contextual operator choices');
