import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../../design/audio/original-themes.json',import.meta.url),'utf8'));
assert.equal(data.version,1);assert.equal(data.provenance.source,'original');assert.equal(data.provenance.license,'CC0-1.0');
for(const id of ['hub','backyard','warehouse','heat-hold']){const t=data.themes[id];assert.ok(t.bpm>=72&&t.bpm<=174);assert.equal(t.stepsPerBar,16);assert.equal(t.bars,4);assert.equal(t.chords.length,4);assert.ok(t.chords.every(c=>c.length>=3&&c.length<=4&&c.every(n=>Number.isInteger(n)&&n>=36&&n<=90)));assert.ok(t.melody.length>=12&&t.melody.length<=32);for(const n of t.melody){assert.ok(n.step>=0&&n.step<64&&Number.isInteger(n.midi)&&n.midi>=36&&n.midi<=90&&n.duration>=.25&&n.duration<=8&&n.velocity>0&&n.velocity<=1);}}
assert.equal(new Set(Object.values(data.themes).map(t=>JSON.stringify(t.melody))).size,4);
console.log('PASS P2 COMPOSER: four distinct original four-bar themes and renderable note/provenance contracts');
