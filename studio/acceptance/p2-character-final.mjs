import assert from 'node:assert/strict';
import {CLIPS,samplePose,animationEvents} from '../../game/animation/operator.mjs';
const actions=['idle','walk','climb','observe','valve','recoil'];
for(const a of actions){
 const c=CLIPS[a];assert.equal(c.fps,18);assert.equal(typeof c.loop,'boolean');assert.ok(c.frames.length>=4);
 assert.ok(new Set(c.frames.map(f=>JSON.stringify([f.bob,f.leg,f.arm,f.lean]))).size>=4,a+' needs authored poses');
 for(const f of c.frames){for(const k of ['bob','leg','arm','lean'])assert.ok(Number.isFinite(f[k])&&Math.abs(f[k])<=8);assert.ok(Array.isArray(f.events));}
 const old=JSON.stringify(CLIPS);const p=samplePose(a,.23);p.bob=99;assert.equal(JSON.stringify(CLIPS),old,'sampler must return fresh poses');
 const es=animationEvents(a,0,1.9);assert.ok(es.every((e,i)=>e.time>0&&e.time<=1.9&&(!i||e.time>=es[i-1].time)));
 assert.deepEqual(animationEvents(a,0,.9).concat(animationEvents(a,.9,1.9)),es,'markers cannot duplicate or disappear at scheduling boundaries');
}
assert.equal(CLIPS.recoil.loop,false);assert.deepEqual(samplePose('unknown',0),samplePose('idle',0));
for(const bad of [NaN,Infinity,-1])assert.throws(()=>samplePose('walk',bad));
assert.throws(()=>animationEvents('walk',2,1));assert.throws(()=>animationEvents('walk',0,3));
for(const [a,name] of [['walk','footstep'],['climb','ladder.step'],['valve','valve.rotate'],['observe','inspect.raise'],['recoil','recoil']])assert.ok(animationEvents(a,0,1.9).some(e=>e.name===name),a+' audible marker');
console.log('PASS P2 CHARACTER: six authored 18 FPS clips, immutable sampling and exact audio-marker boundaries');
