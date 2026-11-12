import test from 'node:test';
import assert from 'node:assert/strict';
import {DeviceControl} from '../game/interaction/valve-wheel.mjs';
import {ContractSession} from '../game/missions/contract-session.mjs';
import {BurnerSolver} from '../game/simulation/burner.mjs';
import {JOBS,MissionEvaluator} from '../game/missions/jobs.mjs';
import {environmentAt} from '../game/world/parallax.mjs';
import {PlatformPlayer} from '../game/player/platformer.mjs';
import {SCENES} from '../game/world/industrial-yard.mjs';
test('tactile wheel wraps angles without jumps; dampers, stops, fine keys and release work',()=>{
 const v=new DeviceControl({value:.5,max:.58});v.begin(-100,1,0,0);v.move(-100,-1);assert.ok(Math.abs(v.value-.5)<.02);v.end();const value=v.value;v.move(100,100);assert.equal(v.value,value);
 assert.equal(v.nudge(100).value,.58);assert.equal(v.nudge(-100).value,0);assert.equal(v.nudge(1,true).value,.005);
 const d=new DeviceControl({kind:'damper',value:.5});d.begin(0,100,0,0);assert.ok(d.move(0,60).value>.5);assert.equal(d.nudge(100).atLimit,true);assert.throws(()=>d.set(NaN));
});
test('authored fault loops block free automatic completion and cannot be repaired before diagnosis',()=>{
 const s=new ContractSession('warehouse');assert.equal(s.repair('free-damper'),false);assert.equal(s.limit('draft'),.58);
 s.inspect();assert.equal(s.repair('secure-intake'),false);assert.equal(s.repair('free-damper'),true);assert.equal(s.limit('draft'),1);
 s.adjust('draft',.5,.61);assert.equal(s.adjusted,true);assert.equal(s.tick(.1,{mainLit:true,pilotLit:true,stability:1,failed:false},false),false);
 for(let i=0;i<6;i++)s.tick(.1,{mainLit:true,pilotLit:true,stability:1,failed:false},true);assert.equal(s.verified,true);
 assert.deepEqual(new ContractSession('warehouse',s.snapshot()).snapshot(),s.snapshot());
});
test('all authored Pass Two fault/adjust/verify paths complete with the free calibrated kit',()=>{
 for(const job of JOBS){
  const s=new ContractSession(job.id),b=new BurnerSolver(job.burner),e=new MissionEvaluator(job);
  b.ignite();let ready=false;
  for(let i=0;i<350;i++){const state=b.step(1/60);ready=s.tick(1/60,state,true);e.tick(1/60,1/60,{...state,mainLit:ready&&state.mainLit},100);}
  assert.equal(e.status,'active',job.id+' must require physical work');
  s.inspect();if(job.id!=='heat-hold')assert.equal(s.repair(s.definition.repairAction),true);
  const tune=job.id==='warehouse'?{mainFuel:.44,mainAir:.60,draft:.70}:job.id==='heat-hold'?{mainFuel:.35,mainAir:.45,draft:.48}:{mainAir:.55};
  for(const [key,value] of Object.entries(tune)){s.adjust(key,b.devices[key],value);b.setDevice(key,value);}
  const base={...b.definition};
  for(let i=0;i<3000&&e.status==='active';i++){
   Object.assign(b.definition,s.environment(base,environmentAt(job.id,b.time),b.time));
   const state=b.step(1/60),good=s.tick(1/60,state,true);e.tick(1/60,1/60,{...state,mainLit:good&&state.mainLit},100);
  }
  assert.equal(e.status,'won',job.id+' failed no-upgrade physical contract path');
 }
});
test('small tactile increments accumulate into a meaningful physical adjustment',()=>{
 const s=new ContractSession('backyard');s.inspect();s.repair('secure-intake');for(let n=0;n<8;n++)s.adjust('mainAir',.5+n*.005,.505+n*.005);assert.equal(s.adjusted,true);
});
test('restoring mid-ladder preserves contact without reviving held movement or jump',()=>{
 const p=new PlatformPlayer(SCENES.hub),l=SCENES.hub.ladders[0];p.restorePosition({x:l.x+10,y:l.y+150,climbing:true,facing:-1},SCENES.hub);const y=p.state.y;
 p.update(.1,{x:0,y:0,jump:false},SCENES.hub);assert.equal(p.state.y,y);assert.equal(p.state.climbing,true);assert.equal(p.state.vx,0);p.update(.1,{x:0,y:-1,jump:false},SCENES.hub);assert.ok(p.state.y<y);
});
test('environment effects affect real airflow without accumulating or changing device positions',()=>{
 const b=new BurnerSolver(),s=new ContractSession('backyard'),base={...b.definition},d={...b.devices};
 const effect={airflowFactor:.9,draftFactor:1,heatLossFactor:1};Object.assign(b.definition,s.environment(base,effect,0));const a=b.step(.1).airFlow;
 for(let i=0;i<200;i++)Object.assign(b.definition,s.environment(base,effect,0));assert.deepEqual(b.devices,d);assert.ok(b.definition.airflowFactor>.5);
 s.inspect();s.repair('secure-intake');Object.assign(b.definition,s.environment(base,effect,0));assert.ok(b.step(.1).airFlow>a);
});
test('Heat-Hold starting tune allows a fair physical trip to its controls before overheat',()=>{
 const job=JOBS.find(j=>j.id==='heat-hold'),b=new BurnerSolver(job.burner),s=new ContractSession(job.id),base={...b.definition};b.ignite();
 for(let n=0;n<1800;n++){Object.assign(b.definition,s.environment(base,environmentAt(job.id,b.time),b.time));b.step(1/60);}
 assert.equal(b.failed,false);assert.ok(b.temperature<1.58);assert.equal(s.adjusted,false,'safe starting tune does not bypass physical work');
});
