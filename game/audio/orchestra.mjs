// Original symbolic scores rendered locally. Scheduling uses the audio clock;
// presentation ticks only refill a short lookahead window.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const midi=n=>440*Math.pow(2,(n-69)/12);
export class Orchestra {
 constructor(score,cueMap=()=>null){this.score=score;this.cueMap=cueMap;this.context=null;this.master=null;this.volume=.38;this.notes=new Set();this.sceneId=null;this.events=[];this.cursor=0;this.cycle=0;this.origin=0;this.loopSeconds=0;this.active=false;this.tension=0;this.maxNotes=24;this.lastCue=new Map();}
 attach(context){if(this.context===context)return;this.suspend();this.context=context;this.master=context.createGain();this.master.gain.value=0;this.master.connect(context.destination);this.sceneId=null;}
 arrange(id){
  const theme=this.score?.themes?.[id]??this.score?.themes?.hub;if(!theme)return false;
  this.stopNotes();const stepSeconds=60/theme.bpm/4;
  this.events=theme.voices.flatMap(v=>v.notes.map(n=>({at:n.step*stepSeconds,duration:n.duration*stepSeconds,frequency:midi(n.midi),gain:v.gain*n.velocity,waveform:v.waveform,tensionMin:v.tensionMin??0}))).sort((a,b)=>a.at-b.at);
  this.sceneId=id;this.cursor=0;this.cycle=0;this.loopSeconds=theme.bars*theme.stepsPerBar*stepSeconds;this.origin=this.context.currentTime+.04;return this.events.length>0;
 }
 update({sceneId='hub',tension=0,paused=false}={}){
  const c=this.context;if(!c||!this.master)return;
  if(paused||c.state!=='running'||this.volume<=0){if(this.active)this.suspend();return;}
  const now=c.currentTime;
  if(!this.active||this.sceneId!==sceneId||now-this.origin-this.cycle*this.loopSeconds>this.loopSeconds){if(!this.arrange(sceneId))return;}
  this.active=true;this.tension=clamp(Number.isFinite(tension)?tension:0,0,1);this.master.gain.setTargetAtTime(clamp(this.volume,0,1)*.30,now,.06);
  let count=0;
  while(this.events.length&&count++<128){
   const event=this.events[this.cursor],at=this.origin+this.cycle*this.loopSeconds+event.at;
   if(at>now+.16)break;
   if(at>=now-.01&&this.tension>=event.tensionMin)this.tone({...event,at:Math.max(now,at),music:true});
   this.cursor++;if(this.cursor===this.events.length){this.cursor=0;this.cycle++;}
  }
 }
 tone({at,frequency,endFrequency=frequency,duration,gain,waveform='sine',music=false}){
  const c=this.context;if(!c||c.state!=='running'||!Number.isFinite(at)||!Number.isFinite(frequency)||!Number.isFinite(duration))return false;
  if(this.notes.size>=this.maxNotes)return false;
  const osc=c.createOscillator(),amp=c.createGain(),entry={osc,amp,cleaned:false,music};
  const length=clamp(duration,.025,2),start=Math.max(c.currentTime,at),level=clamp(gain,0,.14);
  osc.type=waveform;osc.frequency.setValueAtTime(clamp(frequency,25,3000),start);osc.frequency.exponentialRampToValueAtTime(clamp(endFrequency,25,3000),start+length);
  amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(level,start+Math.min(.025,length*.15));amp.gain.setValueAtTime(level*.7,start+length*.65);amp.gain.exponentialRampToValueAtTime(.0001,start+length);
  osc.connect(amp);amp.connect(music?this.master:c.destination);this.notes.add(entry);osc.onended=()=>this.release(entry,false);osc.start(start);osc.stop(start+length+.015);return true;
 }
 cue(name,volume=.7){
  const c=this.context,definition=this.cueMap(name);if(!c||!definition||volume<=0)return false;
  // Per-event throttle keeps contact chatter/held detents bounded.
  if(c.currentTime-(this.lastCue.get(name)??-100)<.045)return false;
  this.lastCue.set(name,c.currentTime);return this.tone({...definition,at:c.currentTime+definition.offsetSeconds,gain:definition.gain*clamp(volume,0,1)});
 }
 release(entry,stop=true){
  if(entry.cleaned)return;entry.cleaned=true;entry.osc.onended=null;
  if(stop){try{entry.osc.stop();}catch{}}
  entry.osc.disconnect();entry.amp.disconnect();this.notes.delete(entry);
 }
 stopNotes(){for(const entry of [...this.notes])this.release(entry);}
 suspend(){this.active=false;this.stopNotes();if(this.master&&this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.03);}
 snapshot(){return {active:this.active,sceneId:this.sceneId,voices:this.notes.size,maxVoices:this.maxNotes,scheduledCursor:this.cursor,cycle:this.cycle};}
}
