// Original, synthesized process audio. No external recordings or copyrighted music.
export class ProcessSound{
  constructor(){this.context=null;this.osc=null;this.gain=null;this.enabled=false;}
  async unlock(){
    if(this.enabled){await this.context?.resume();return;}
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio)return;
    this.context=new Audio();this.gain=this.context.createGain();
    this.gain.gain.value=0;this.gain.connect(this.context.destination);
    this.osc=this.context.createOscillator();this.osc.type='sawtooth';
    this.osc.frequency.value=42;this.osc.connect(this.gain);this.osc.start();this.enabled=true;
    await this.context.resume();
  }
  update(state,watching){
    if(!this.enabled)return;
    const now=this.context.currentTime;
    const flow=state.mainLit?state.heatRelease:state.pilotLit?0.04:0;
    this.osc.frequency.setTargetAtTime(36+flow*43+state.soot*14,now,0.08);
    this.gain.gain.setTargetAtTime(Math.min(0.065,flow*0.065)*(watching?1:0.38),now,0.06);
  }
  click(){
    if(!this.enabled)return;
    const now=this.context.currentTime;
    const tone=this.context.createOscillator(),g=this.context.createGain();
    tone.type='triangle';tone.frequency.value=250;
    tone.frequency.exponentialRampToValueAtTime(80,now+0.10);
    g.gain.setValueAtTime(0.07,now);
    g.gain.exponentialRampToValueAtTime(0.001,now+0.12);
    tone.connect(g);g.connect(this.context.destination);tone.start(now);tone.stop(now+0.13);
  }
  stop(){if(this.enabled)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.06);}
}
