// I.C.E. data-first, deterministic *gameplay* combustion model.
// Dimensionless process quantities; never use this for real burner engineering or safety decisions.
export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=(value,target,rate,dt)=>value+(target-value)*clamp(rate*dt);
export const DEFAULT_BURNER=Object.freeze({
  pilotFuel:0.22,pilotAir:0.28,mainFuel:0.44,mainAir:0.52,draft:0.48,
  airflowFactor:1,fuelFactor:1,draftFactor:1,heatLoss:0.31,ignitionRisk:0.14
});
export class BurnerSolver{
  constructor(config={}){
    this.definition={...DEFAULT_BURNER,...config};
    this.devices={pilotFuel:this.definition.pilotFuel,pilotAir:this.definition.pilotAir,
      mainFuel:this.definition.mainFuel,mainAir:this.definition.mainAir,draft:this.definition.draft};
    this.pilotLit=false;this.mainLit=false;this.unburntFuel=0;this.temperature=0.12;
    this.heatRelease=0;this.stability=0;this.soot=0;this.pilotStability=0;this.mainRatio=0;
    this.fuelFlow=0;this.airFlow=0;this.peakTemperature=0.12;
    this.overheatSeconds=0;this.failed=false;this.lastEvent=null;this.time=0;this.events=[];
  }
  setDevice(name,value){
    if(!Object.hasOwn(this.devices,name))throw Error('unknown device '+name);
    if(!Number.isFinite(value))throw Error('invalid device value');
    this.devices[name]=clamp(value);
  }
  resetEvents(){this.events=[];this.lastEvent=null;}
  emit(type){this.lastEvent=type;this.events.push(type);}
  ignite(){
    if(this.failed)return this.snapshot();
    const pFuel=this.devices.pilotFuel**1.2;
    const pAir=(0.05+this.devices.pilotAir)*0.8;
    const ratio=pFuel/Math.max(pAir,0.02);
    if(!this.pilotLit&&this.devices.pilotFuel>0.10&&this.devices.pilotAir>0.11&&ratio>0.50&&ratio<1.55){
      this.pilotLit=true;this.emit('pilot.ignite');
      if(this.unburntFuel>this.definition.ignitionRisk){this.emit('combustion.puff');this.temperature+=0.32;this.unburntFuel*=0.15;}
    }else if(!this.pilotLit)this.emit('pilot.ignition_fail');
    return this.snapshot();
  }
  step(dt){
    if(!Number.isFinite(dt)||dt<0||dt>0.25)throw Error('invalid simulation step');
    this.resetEvents();
    this.time+=dt;
    const d=this.devices;
    const pilotRatio=d.pilotFuel**1.2/Math.max((0.05+d.pilotAir)*0.8,0.02);
    const pilotCanHold=d.pilotFuel>0.085&&d.pilotAir>0.1&&pilotRatio>0.43&&pilotRatio<1.7;
    if(this.pilotLit&&!pilotCanHold){this.pilotLit=false;this.emit('pilot.flameout');}
    this.pilotStability=this.pilotLit?clamp(1-Math.abs(pilotRatio-0.9)*0.9):0;
    const draftCoefficient=(0.56+d.draft*0.9)*this.definition.draftFactor;
    this.fuelFlow=Math.pow(d.mainFuel,1.45)*this.definition.fuelFactor;
    this.airFlow=(0.05+Math.pow(d.mainAir,1.20))*draftCoefficient*this.definition.airflowFactor;
    this.mainRatio=this.fuelFlow/Math.max(this.airFlow*0.70,0.01);
    const mainCanHold=this.fuelFlow>0.032&&this.airFlow>0.115&&
      this.mainRatio>0.50&&this.mainRatio<1.72&&d.draft>0.09&&!this.failed;
    if(this.mainLit&&!mainCanHold){this.mainLit=false;this.emit('main.flameout');}
    if(!this.mainLit&&this.pilotLit&&mainCanHold){
      this.mainLit=true;this.emit('main_flame.attach');
      if(this.unburntFuel>this.definition.ignitionRisk){
        this.emit('combustion.puff');this.temperature+=0.30;
      }
      this.unburntFuel*=0.05;
    }
    if(!this.mainLit)this.unburntFuel=clamp(this.unburntFuel+this.fuelFlow*0.23*dt,0,1.8);
    else this.unburntFuel=Math.max(0,this.unburntFuel-0.5*dt);
    const mixtureQuality=clamp(1-Math.abs(this.mainRatio-0.97)*1.14);
    this.stability=this.mainLit?mixtureQuality*clamp(d.draft*1.9,0.4,1):0;
    this.heatRelease=this.mainLit?this.fuelFlow*(0.20+0.80*this.stability):0;
    this.soot=this.mainLit?clamp((this.mainRatio-1.06)*1.6)*clamp(this.fuelFlow*2):0;
    const targetHeat=this.heatRelease*1.55;
    this.temperature=clamp(this.temperature+(targetHeat-
      (this.temperature-0.12)*this.definition.heatLoss)*dt,0.12,3);
    this.peakTemperature=Math.max(this.peakTemperature,this.temperature);
    if(this.temperature>1.58)this.overheatSeconds+=dt;
    else this.overheatSeconds=Math.max(0,this.overheatSeconds-0.7*dt);
    if(this.overheatSeconds>4&&!this.failed){
      this.failed=true;this.pilotLit=false;this.mainLit=false;this.emit('chamber.overheat');
    }
    return this.snapshot();
  }
  snapshot(){return {
    time:this.time,devices:{...this.devices},pilotLit:this.pilotLit,mainLit:this.mainLit,
    unburntFuel:this.unburntFuel,temperature:this.temperature,heatRelease:this.heatRelease,
    stability:this.stability,soot:this.soot,pilotStability:this.pilotStability,
    mainRatio:this.mainRatio,fuelFlow:this.fuelFlow,airFlow:this.airFlow,
    peakTemperature:this.peakTemperature,overheatSeconds:this.overheatSeconds,
    failed:this.failed,lastEvent:this.lastEvent,events:[...this.events]
  };}
}
