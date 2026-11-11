// Independent audio-graph contract checks. Browser smoke separately exercises actual Web Audio.
import assert from 'node:assert/strict';
import {ProcessSound} from '../../game/audio/sound.mjs';
const original={AudioContext:globalThis.AudioContext,webkitAudioContext:globalThis.webkitAudioContext};
const nodes=[],buffers=[];
class Param{
 constructor(){this.value=0;}
 setValueAtTime(v){assert.ok(Number.isFinite(v));this.value=v;}
 setTargetAtTime(v){assert.ok(Number.isFinite(v));this.value=v;}
 linearRampToValueAtTime(v){assert.ok(Number.isFinite(v));this.value=v;}
 exponentialRampToValueAtTime(v){assert.ok(Number.isFinite(v)&&v>0);this.value=v;}
 cancelScheduledValues(){}
 cancelAndHoldAtTime(){}
}
function node(kind){
 const n={kind,gain:new Param(),frequency:new Param(),Q:new Param(),playbackRate:new Param(),
  connect(){return n;},disconnect(){n.disconnected=true;},start(){n.started=true;},stop(){n.stopped=true;}};
 nodes.push(n);return n;
}
class Audio{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination={};this.resumes=0;}
 async resume(){this.state='running';this.resumes++;}
 createGain(){return node('gain');}
 createOscillator(){return node('oscillator');}
 createBufferSource(){return node('bufferSource');}
 createBiquadFilter(){return node('filter');}
 createBuffer(channels,length,rate){
  const arrays=Array.from({length:channels},()=>new Float32Array(length));
  const b={duration:length/rate,length,sampleRate:rate,getChannelData:i=>arrays[i]};buffers.push(b);return b;
 }
}
try{
 delete globalThis.AudioContext;delete globalThis.webkitAudioContext;
 const unsupported=new ProcessSound();await unsupported.unlock();unsupported.update({},true);unsupported.click();unsupported.stop();
 globalThis.AudioContext=Audio;
 const sound=new ProcessSound();await sound.unlock();
 assert.equal(sound.enabled,true);assert.equal(sound.context.state,'running');
 const initialNodes=nodes.length;await sound.unlock();assert.equal(nodes.length,initialNodes,'unlock reuses audio graph');
 assert.ok(buffers.length>0,'synthesized noise buffer');
 assert.ok(buffers.some(b=>b.getChannelData(0).some(v=>Math.abs(v)>.001)),'audible nonzero noise');
 assert.ok(nodes.some(n=>n.kind==='bufferSource'&&n.loop&&n.started),'looping process-noise source');
 assert.ok(nodes.some(n=>n.kind==='filter'),'filtered combustion texture');
 const main={pilotLit:true,mainLit:true,heatRelease:.65,stability:.96,soot:0,mainRatio:.97,
  temperature:1.1,fuelFlow:.7,airFlow:.9,pilotStability:.95,time:1,events:[],lastEvent:null,failed:false};
 sound.update(main,true);const focused=sound.gain.gain.value;
 assert.ok(focused>0&&focused<=.16,'restrained master gain');
 sound.update(main,false);assert.ok(sound.gain.gain.value<focused,'world sound is quieter');
 sound.update({...main,mainLit:false,heatRelease:0},true);
 assert.ok(sound.gain.gain.value>0&&sound.gain.gain.value<focused,'pilot is quieter than main');
 const steadyNodes=nodes.length;
 for(let i=0;i<600;i++){sound.context.currentTime=i/60;sound.update({...main,time:i/60},true);}
 assert.equal(nodes.length,steadyNodes,'regular updates create no AudioNodes');
 sound.update({...main,pilotLit:false,mainLit:false,heatRelease:0},true);
 assert.equal(sound.gain.gain.value,0,'closed burner is silent');
 sound.update(main,true);sound.stop();assert.equal(sound.gain.gain.value,0,'stop silences all layers');
 sound.update(main,true);assert.equal(sound.gain.gain.value,0,'updates do not restart stopped audio');
 await sound.unlock();sound.update(main,true);
 let start=nodes.length;sound.click();
 let transient=nodes.slice(start),tone=transient.find(n=>n.kind==='oscillator');
 assert.ok(tone?.onended,'natural completion cleanup is registered');
 assert.ok(transient.length<=6,'bounded ignition transient');
 tone.onended();assert.ok(transient.every(n=>n.disconnected),'natural completion disconnects transient nodes');
 const transientStart=nodes.length;
 for(let i=0;i<30;i++){
  sound.click();
  assert.ok(nodes.slice(transientStart).filter(n=>!n.disconnected).length<=2,'repeated ignition clicks replace previous transient');
 }
 sound.stop();
 assert.ok(nodes.slice(transientStart).every(n=>n.disconnected),'stop during click cleans up every transient node');
 const stoppedNodes=nodes.length;sound.click();
 assert.equal(nodes.length,stoppedNodes,'stopped sound cannot create a transient');
 for(const b of buffers)assert.ok(b.getChannelData(0).every(Number.isFinite),'finite noise samples');
 console.log('PASS ICE-AUDIO-002: original filtered noise, reusable graph, mobile unlock, process volume, shutdown silence, 600 node-stable updates and transient cleanup');
}finally{
 for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
