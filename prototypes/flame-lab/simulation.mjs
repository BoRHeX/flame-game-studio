// Deterministic, dimensionless I.C.E. laboratory prototype.
// Not calibrated for physical burner design or real equipment operation.
export const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
export class BurnerSolver {
  constructor(){
    this.fuelValve=0.45;this.airDamper=0.50;this.spark=false;
    this.lit=false;this.unburntFuel=0;this.temperature=0.12;
    this.heatRelease=0;this.soot=0;this.stability=0;this.ratio=0;
    this.fuelFlow=0;this.airFlow=0;this.puff=false;this.time=0;
  }
  control({fuelValve=this.fuelValve,airDamper=this.airDamper,spark=this.spark}={}){
    this.fuelValve=clamp(Number(fuelValve));
    this.airDamper=clamp(Number(airDamper));
    this.spark=Boolean(spark);
  }
  step(dt){
    if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('invalid simulation step');
    this.time+=dt;
    this.fuelFlow=this.fuelValve**1.45;
    this.airFlow=0.04+this.airDamper**1.2;
    this.ratio=this.fuelFlow/(this.airFlow*0.66);
    const mixQuality=clamp(1-Math.abs(this.ratio-1)*1.2);
    const canBurn=this.fuelFlow>0.035&&this.airFlow>0.09&&this.ratio>0.52&&this.ratio<1.75;
    this.puff=false;
    if(!this.lit){
      this.unburntFuel=clamp(this.unburntFuel+this.fuelFlow*dt*0.15,0,2);
      if(this.spark&&canBurn){
        this.puff=this.unburntFuel>0.18;
        this.lit=true;
        this.unburntFuel=0;
      }
    }else if(!canBurn){
      this.lit=false;
    }
    this.stability=this.lit?mixQuality:0;
    this.heatRelease=this.lit?this.fuelFlow*(0.25+0.75*this.stability):0;
    this.soot=this.lit?clamp((this.ratio-1.12)*1.7):0;
    this.temperature=clamp(this.temperature+(this.heatRelease*1.05-(this.temperature-0.12)*0.34)*dt,0.12,3);
    return this.snapshot();
  }
  snapshot(){return {time:this.time,lit:this.lit,fuelValve:this.fuelValve,airDamper:this.airDamper,fuelFlow:this.fuelFlow,airFlow:this.airFlow,ratio:this.ratio,stability:this.stability,heatRelease:this.heatRelease,soot:this.soot,unburntFuel:this.unburntFuel,temperature:this.temperature,puff:this.puff};}
}
