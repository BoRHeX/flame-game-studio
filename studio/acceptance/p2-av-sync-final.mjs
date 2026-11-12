import assert from 'node:assert/strict';
import {EVENT_CUES,cueForEvent} from '../../game/audio/event-sync.mjs';
const names=['footstep','ladder.step','inspect.raise','valve.rotate','recoil','pilot.spark.begin','pilot.ignite','main_flame.attach','combustion.puff','chamber.overheat','mission.stable','mission.fail','biome.wind_gust','repair.complete'];
for(const name of names){const c=cueForEvent(name);assert.ok(c);assert.ok(['sine','triangle','square','sawtooth'].includes(c.waveform));assert.ok(c.frequency>=35&&c.frequency<=2600&&c.endFrequency>=35&&c.endFrequency<=2600);assert.ok(c.duration>=.025&&c.duration<=.6&&c.gain>=.002&&c.gain<=.12&&c.offsetSeconds>=0&&c.offsetSeconds<=.035);const before=JSON.stringify(EVENT_CUES);c.gain=99;assert.equal(JSON.stringify(EVENT_CUES),before);}
assert.equal(cueForEvent('unknown'),null);assert.notDeepEqual(cueForEvent('mission.stable'),cueForEvent('mission.fail'));
console.log('PASS P2 AV SYNC: event-specific synthesized cues, bounded latency/volume and immutable mappings');
