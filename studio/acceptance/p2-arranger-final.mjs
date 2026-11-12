import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../../assets/audio/original-score.json',import.meta.url),'utf8'));
const themes=JSON.parse(readFileSync(new URL('../../design/audio/original-themes.json',import.meta.url),'utf8')).themes;
assert.equal(data.version,1);assert.equal(data.provenance.source,'original');assert.equal(data.provenance.license,'CC0-1.0');
for(const id of ['hub','backyard','warehouse','heat-hold']){const t=data.themes[id];assert.equal(t.bpm,themes[id].bpm);assert.equal(t.stepsPerBar,16);assert.equal(t.bars,4);assert.ok(t.voices.length>=3&&t.voices.length<=5);for(const name of ['pad','bass','melody'])assert.ok(t.voices.some(v=>v.id===name));for(const v of t.voices){assert.ok(['sine','triangle','square','sawtooth'].includes(v.waveform));assert.ok(v.gain>=.005&&v.gain<=.14&&v.tensionMin>=0&&v.tensionMin<=1);assert.ok(v.notes.length>0&&v.notes.length<=96);for(const n of v.notes)assert.ok(n.step>=0&&n.step<64&&Number.isInteger(n.midi)&&n.midi>=24&&n.midi<=90&&n.duration>=.25&&n.duration<=8&&n.velocity>0&&n.velocity<=1);}
 const melody=t.voices.find(v=>v.id==='melody').notes;assert.ok(themes[id].melody.every(n=>melody.some(m=>m.step===n.step&&m.midi===n.midi)),'preserve original motif');}
console.log('PASS P2 ARRANGER: bounded original instrument layers preserving accepted composer motifs');
