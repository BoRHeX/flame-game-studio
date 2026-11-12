// Authored physical fault loops, separate from combustion equations and UI.
export const CONTRACTS=Object.freeze({
 backyard:Object.freeze({title:'Backyard Light-Off',fault:'Loose intake shield',repair:'Secure the intake shield',symbol:'✦',faultIcon:'☂',device:'mainAir',repairAction:'secure-intake',hint:'Inspect the flame, secure the wind shield on the first catwalk, balance main air, then verify at the observation port.'}),
 warehouse:Object.freeze({title:'Warehouse Restart',fault:'Seized draft linkage',repair:'Free and test the draft damper',symbol:'▤',faultIcon:'⚒',device:'draft',repairAction:'free-damper',hint:'Inspect the restricted flame, climb to the draft linkage, repair it, open the draft beyond the old stop, then verify at the port.'}),
 'heat-hold':Object.freeze({title:'Heat-Hold',fault:'Cold heat-soaked vessel',repair:'Balance heat and soot',symbol:'◉',faultIcon:'♨',device:'mainFuel',repairAction:null,hint:'Inspect the chamber. Balance main fuel and air until clean combustion holds inside the marked temperature band.'})
});
export class ContractSession {
 constructor(id,saved=null){
  if(!CONTRACTS[id])throw new TypeError('unknown contract');this.id=id;this.definition=CONTRACTS[id];
  this.inspected=false;this.repaired=id==='heat-hold';this.adjusted=false;this.verified=false;this.verifyTime=0;this.adjustments=0;this.failureReason=null;this.travel={};
  if(saved?.version===1&&saved.id===id){
   for(const k of ['inspected','repaired','adjusted','verified'])if(typeof saved[k]==='boolean')this[k]=saved[k];
   if(Number.isInteger(saved.adjustments)&&saved.adjustments>=0&&saved.adjustments<=100000)this.adjustments=saved.adjustments;
   if(Number.isFinite(saved.verifyTime)&&saved.verifyTime>=0&&saved.verifyTime<=2)this.verifyTime=saved.verifyTime;
   for(const [key,value] of Object.entries(saved.travel??{}))if(['pilotFuel','pilotAir','mainFuel','mainAir','draft'].includes(key)&&Number.isFinite(value)&&value>=0&&value<=100000)this.travel[key]=value;
  }
 }
 inspect(){this.inspected=true;}
 repair(action){if(!this.inspected||action!==this.definition.repairAction||!action)return false;this.repaired=true;return true;}
 adjust(deviceId,previous,value){
  if(![previous,value].every(Number.isFinite)||value<0||value>1)throw new TypeError('invalid adjustment');
  const movement=Math.abs(value-previous);if(movement<1e-8)return;
  this.travel[deviceId]=Math.min(100000,(this.travel[deviceId]??0)+movement);
  this.adjustments++;
  if(this.travel[deviceId]>=.02&&deviceId===this.definition.device&&(this.repaired||this.id==='heat-hold')&&(this.id!=='warehouse'||value>=.60))this.adjusted=true;
 }
 tick(dt,state,watching){
  if(!Number.isFinite(dt)||dt<0||dt>.25)throw new TypeError('invalid contract step');
  const stable=state.mainLit&&state.pilotLit&&!state.failed&&state.stability>=(this.id==='warehouse'?.57:this.id==='heat-hold'?.53:.43);
  if(watching&&this.inspected&&this.repaired&&this.adjusted&&stable){this.verifyTime=Math.min(2,this.verifyTime+dt);if(this.verifyTime>=.5)this.verified=true;}
  else if(!this.verified)this.verifyTime=0;
  return this.inspected&&this.repaired&&this.adjusted&&this.verified;
 }
 limit(deviceId){return this.id==='warehouse'&&deviceId==='draft'&&!this.repaired ? .58 : 1;}
 environment(base,biome,time){
  const next={...base,airflowFactor:(base.airflowFactor??1)*biome.airflowFactor,draftFactor:(base.draftFactor??1)*biome.draftFactor,heatLoss:(base.heatLoss??.31)*biome.heatLossFactor};
  if(this.id==='backyard'&&!this.repaired)next.airflowFactor*=.82+.08*Math.sin(time*.85);
  if(this.id==='warehouse'&&!this.repaired)next.draftFactor*=.84;
  return next;
 }
 steps(){return [{id:'inspect',icon:'◎',done:this.inspected},{id:'repair',icon:this.definition.faultIcon,done:this.repaired},{id:'adjust',icon:this.id==='warehouse'?'↻':'≋',done:this.adjusted},{id:'verify',icon:'◉',done:this.verified}];}
 next(){return this.steps().find(x=>!x.done)?.id??'hold';}
 reason(state,money,elapsed,deadline){return state.failed?'Chamber overheated':money<=0?'Operating funds exhausted':elapsed>=deadline?'Contract time expired':!state.pilotLit?'Pilot extinguished':!state.mainLit?'Main flame lost':null;}
 snapshot(){return {version:1,id:this.id,inspected:this.inspected,repaired:this.repaired,adjusted:this.adjusted,verified:this.verified,verifyTime:this.verifyTime,adjustments:this.adjustments,travel:{...this.travel}};}
}
