// Visual particles follow the authoritative burner state and authored chamber flow.
import {flowAt} from '../chambers/flow.mjs';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export class FlameParticles{
  constructor(capacity=1200,seed=1933){
    this.capacity=capacity;this.seed=seed>>>0;this.cursor=0;
    this.active=new Uint8Array(capacity);
    this.x=new Float32Array(capacity);this.y=new Float32Array(capacity);
    this.vx=new Float32Array(capacity);this.vy=new Float32Array(capacity);
    this.life=new Float32Array(capacity);this.maxLife=new Float32Array(capacity);
    this.size=new Uint8Array(capacity);this.smoke=new Uint8Array(capacity);
    this.lane=new Float32Array(capacity);
    this.mode=new Uint8Array(capacity);this.ratio=new Float32Array(capacity);
    this.heat=new Float32Array(capacity);this.stability=new Float32Array(capacity);
    this.flow={vx:0,vy:0};this.spawnRemainder=0;
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  clear(){this.active.fill(0);this.cursor=0;this.spawnRemainder=0;}
  spawn(chamber,state){
    if(!this.capacity||(!state.mainLit&&!state.pilotLit))return;
    const n=this.cursor++%this.capacity,main=!!state.mainLit;
    const ratio=Number.isFinite(state.mainRatio)?state.mainRatio:0;
    const heat=Number.isFinite(state.heatRelease)?clamp(state.heatRelease,0,1):0;
    const stability=main?state.stability:state.pilotStability;
    const soot=Number.isFinite(state.soot)?clamp(state.soot,0,1):0;
    this.active[n]=1;this.mode[n]=main?1:0;
    this.ratio[n]=ratio;this.heat[n]=heat;
    this.stability[n]=Number.isFinite(stability)?clamp(stability,0,1):1;
    this.x[n]=chamber.nozzle.x+(this.random()-.5)*6;
    this.y[n]=chamber.nozzle.y+(this.random()-.5)*6;
    this.vx[n]=(this.random()-.5)*(main?16:5);
    this.vy[n]=(this.random()-.5)*(main?16:5);
    this.life[n]=0;
    this.smoke[n]=main&&ratio>1.06&&this.random()<soot*.8?1:0;
    this.maxLife[n]=this.smoke[n]?1.1+this.random()*.55:main ? .65+this.random()*.42 : .25+this.random()*.13;
    this.size[n]=main?5+Math.floor(this.random()*5):3+Math.floor(this.random()*3);
    this.lane[n]=(this.random()-.5)*2;
  }
  step(dt,state,chamber){
    if(!Number.isFinite(dt)||dt<0||dt>0.25)throw Error('invalid particle step');
    const main=!!state.mainLit,pilot=!!state.pilotLit;
    if(main||pilot){
      const heat=Number.isFinite(state.heatRelease)?clamp(state.heatRelease,0,1):0;
      const rate=main?320+heat*850:100;
      this.spawnRemainder+=rate*dt;
      const count=Math.min(this.capacity,Math.floor(this.spawnRemainder));
      this.spawnRemainder-=Math.floor(this.spawnRemainder);
      for(let i=0;i<count;i++)this.spawn(chamber,state);
    }else this.spawnRemainder=0;
    for(let i=0;i<this.capacity;i++){
      if(!this.active[i])continue;
      this.life[i]+=dt;
      if(this.life[i]>=this.maxLife[i]){this.active[i]=0;continue;}
      const zone=flowAt(chamber,this.x[i],this.y[i],i*.011,this.flow);
      const speed=this.mode[i]?1:.45;
      const turbulence=(1-this.stability[i])*(this.mode[i]?24:5);
      this.x[i]+=(zone.vx*speed+this.vx[i]+Math.sin(this.life[i]*21+i)*turbulence)*dt;
      this.y[i]+=(zone.vy*speed+this.vy[i]+Math.cos(this.life[i]*19+i*.9)*turbulence)*dt;
      if(!Number.isFinite(this.x[i])||!Number.isFinite(this.y[i])||
        this.x[i]<5||this.x[i]>635||this.y[i]<5||this.y[i]>350)this.active[i]=0;
    }
  }
  draw(ctx,state,chamber){
    // The root belongs to the youngest emitted particle, not the current controls.
    // Its short fade bridges nozzle and advected particles without repainting the chamber.
    ctx.save();
    const alpha=ctx.globalAlpha;
    let root=-1,youngest=.26;
    for(let i=0;i<this.capacity;i++){
      if(this.active[i]&&this.life[i]<youngest){youngest=this.life[i];root=i;}
    }
    if(root>=0){
      const main=this.mode[root]===1,up=chamber.orientation==='updraft';
      const strength=clamp((.26-youngest)/.16,0,1);
      const width=main?12:7,length=main?20:10;
      const x=Math.round(chamber.nozzle.x),y=Math.round(chamber.nozzle.y);
      ctx.globalAlpha=alpha*strength*.65;ctx.fillStyle='#287fd3';
      if(up)ctx.fillRect(x-(width>>1),y-length,width,length);
      else ctx.fillRect(x,y-(width>>1),length,width);
      ctx.globalAlpha=alpha*strength*.9;ctx.fillStyle='#72d2ff';
      if(up)ctx.fillRect(x-2,y-length+4,4,length-4);
      else ctx.fillRect(x,y-2,length-4,4);
      ctx.globalAlpha=alpha*strength;ctx.fillStyle='#f4fcff';
      if(up)ctx.fillRect(x-1,y-7,2,7);
      else ctx.fillRect(x,y-1,7,2);
    }
    for(let i=0;i<this.capacity;i++){
      if(!this.active[i])continue;
      const age=this.life[i]/this.maxLife[i],main=this.mode[i]===1;
      const ratio=this.ratio[i],heat=this.heat[i],unstable=1-this.stability[i];
      const factor=ratio>1.15?1.25:ratio<.76?.72:1;
      const plume=Math.sin(Math.PI*age)*(main?(10+heat*30)*factor:4)*(1+unstable*.45);
      const px=chamber.orientation==='updraft'?this.x[i]+this.lane[i]*plume:this.x[i];
      const py=chamber.orientation==='updraft'?this.y[i]:this.y[i]+this.lane[i]*plume;
      const x=Math.round(px),y=Math.round(py);
      if(this.smoke[i]&&age>.48){
        const s=Math.max(2,Math.round(this.size[i]*(.8+age)));
        ctx.globalAlpha=alpha*.38*clamp((1-age)/.35,0,1);
        ctx.fillStyle='#596069';ctx.fillRect(x-s/2|0,y-s/2|0,s,s);
        continue;
      }
      const fade=clamp((1-age)*3,0,1);
      const s=Math.max(2,Math.round(this.size[i]*(1-age*.45)*(1+unstable*.25)));
      ctx.globalAlpha=alpha*fade*(.35-unstable*.1);
      ctx.fillStyle=!main?'#3a8dd9':ratio<.76?'#397ec3':ratio>1.15?'#d04b1d':'#ed7825';
      ctx.fillRect((x-s)|0,(y-s)|0,s*2,s*2);
      ctx.globalAlpha=alpha*fade;
      if(!main)ctx.fillStyle=age<.42?'#d6f7ff':'#5cbcff';
      else if(age<.16)ctx.fillStyle=age<.07?'#edfaff':'#55bfff';
      else if(ratio<.76)ctx.fillStyle=age<.48?'#bdefff':age<.75?'#68c9f5':'#337fba';
      else if(ratio>1.15)ctx.fillStyle=age<.4?'#fff2af':age<.72?'#ffad42':'#db5421';
      else if(unstable>.35)ctx.fillStyle=age<.4?'#ffe3a0':age<.7?'#ffb34e':'#e86a28';
      else ctx.fillStyle=age<.4?'#fff9d3':age<.7?'#ffd16a':'#ff8a30';
      ctx.fillRect((x-s/2)|0,(y-s/2)|0,s,s);
      if(age<.12){
        const core=Math.max(1,s>>1);
        ctx.fillStyle='#f4fcff';ctx.fillRect((x-core/2)|0,(y-core/2)|0,core,core);
      }
    }
    ctx.restore();
  }
  activeCount(){let n=0;for(let i=0;i<this.capacity;i++)n+=this.active[i];return n;}
}
