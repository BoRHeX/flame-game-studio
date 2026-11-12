import test from 'node:test';
import assert from 'node:assert/strict';
import {Orchestra} from '../game/audio/orchestra.mjs';
function audio(){
 const nodes=[],params=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 const node=()=>{const n={gain:params(),frequency:params(),connect(){},disconnect(){this.disconnected=true;},start(){},stop(){}};nodes.push(n);return n;};
 return {currentTime:0,state:'running',destination:{},createGain:node,createOscillator:node,nodes};
}
const theme={bpm:120,bars:4,stepsPerBar:16,voices:[{id:'melody',waveform:'sine',gain:.05,tensionMin:0,notes:[{step:0,midi:60,duration:1,velocity:.6},{step:1,midi:64,duration:1,velocity:.6}]}]};
test('score scheduling follows the audio clock, changes scenes and stops every voice on suspension',()=>{
 const c=audio(),o=new Orchestra({themes:{hub:theme,warehouse:theme}});o.attach(c);o.update({sceneId:'hub'});assert.equal(o.snapshot().voices,1);
 const first=[...o.notes][0];c.currentTime=.1;o.update({sceneId:'hub'});assert.equal(o.snapshot().voices,2);assert.equal(o.snapshot().scheduledCursor,0);
 o.update({sceneId:'warehouse'});assert.equal(first.cleaned,true);assert.equal(o.snapshot().sceneId,'warehouse');
 o.update({paused:true});assert.equal(o.notes.size,0);assert.equal(o.active,false);
});
test('event storms cannot exceed the audio voice bound; cleanup and mute are effective',()=>{
 const c=audio(),cue=()=>({frequency:300,endFrequency:80,duration:.1,gain:.04,waveform:'triangle',offsetSeconds:0});const o=new Orchestra({themes:{hub:theme}},cue);o.attach(c);
 for(let i=0;i<500;i++)o.cue('event'+i);assert.equal(o.notes.size,24);o.suspend();assert.equal(o.notes.size,0);assert.ok(c.nodes.slice(1).every(n=>n.disconnected));
 o.volume=0;o.update({sceneId:'hub'});assert.equal(o.notes.size,0);assert.equal(o.cue('muted',0),false);
});
