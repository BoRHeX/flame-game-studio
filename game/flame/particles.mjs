// Typed-array reusable pixel particle pool. The solver controls physical state;
// the chamber flow field controls directions. No per-particle collision O(n^2).
import {flowAt} from '../chambers/flow.mjs';
export class FlameParticles{
  constructor(capacity=1200,seed=1933){
    this.capacity=capacity;this.seed=seed>>>0;this.cursor=0;this.active=new Uint8Array(capacity);
    this.x=new Float32Array(capacity);this.y=new Float32Array(capacity);
    this.vx=new Float32Array(capacity);this.vy=new Float32Array(capacity);
    this.life=new Float32Array(capacity);this.maxLife=new Float32Array(capacity);
    this.size=new Uint8Array(capacity);this.smoke=new Uint8Array(capacity);
    this.spawnRemainder=0;
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  clear(){this.active.fill(0);this.cursor=0;this.spawnRemainder=0;}
  spawn(chamber,state){
    const n=this.cursor++%this.capacity,r=this.random();
    this.active[n]=1;this.x[n]=chamber.nozzle.x+(this.random()-.5)*7;
    this.y[n]=chamber.nozzle.y+(this.random()-.5)*9;
    this.vx[n]=(this.random()-.5)*21;this.vy[n]=(this.random()-.5)*21;
    this.life[n]=0;this.maxLife[n]=0.28+r*0.64;
    this.size[n]=2+Math.floor(this.random()*4);
    this.smoke[n]=this.random()<state.soot*0.8?1:0;
  }
  step(dt,state,chamber){
    if(!Number.isFinite(dt)||dt<0||dt>0.25)throw Error('invalid particle step');
    const pilotOnly=state.pilotLit&&!state.mainLit;
    const rate=state.mainLit?(320+state.heatRelease*850):pilotOnly?65:0;
    this.spawnRemainder+=rate*dt;
    const count=Math.min(this.capacity,Math.floor(this.spawnRemainder));
    this.spawnRemainder-=count;
    for(let i=0;i<count;i++)this.spawn(chamber,state);
    for(let i=0;i<this.capacity;i++){
      if(!this.active[i])continue;
      this.life[i]+=dt;
      if(this.life[i]>=this.maxLife[i]){this.active[i]=0;continue;}
      const zone=flowAt(chamber,this.x[i],this.y[i],i*0.011);
      const turbulence=(1-state.stability)*24;
      this.x[i]+=(zone.vx+this.vx[i]+Math.sin(this.life[i]*21+i)*turbulence)*dt;
      this.y[i]+=(zone.vy+this.vy[i]+Math.cos(this.life[i]*19+i*.9)*turbulence)*dt;
      if(this.x[i]<5||this.x[i]>635||this.y[i]<5||this.y[i]>350)this.active[i]=0;
    }
  }
  draw(ctx,state,chamber){
    ctx.clearRect(0,0,640,360);
    for(let i=0;i<this.capacity;i++){
      if(!this.active[i])continue;
      const age=this.life[i]/this.maxLife[i];
      if(this.smoke[i]&&age>0.48){ctx.fillStyle=age>0.75?'rgba(120,122,127,.30)':'rgba(73,77,83,.46)';}
      else if(!state.mainLit){ctx.fillStyle=age<0.5?'#b5ebff':'#54acfa';}
      else if(state.mainRatio<0.76){ctx.fillStyle=age<0.32?'#e5f9ff':age<.67?'#7ddcff':'#286baa';}
      else if(state.mainRatio>1.15){ctx.fillStyle=age<.32?'#fff5b4':age<.67?'#ffb451':'#cf4e20';}
      else{ctx.fillStyle=age<.25?'#fffdf3':age<.55?'#fff0a0':age<.8?'#ffb34e':'#f36a29';}
      const size=Math.max(1,this.size[i]*(1-age*.6))|0;
      ctx.fillRect(this.x[i]|0,this.y[i]|0,size,size);
    }
  }
  activeCount(){let n=0;for(let i=0;i<this.capacity;i++)n+=this.active[i];return n;}
}
