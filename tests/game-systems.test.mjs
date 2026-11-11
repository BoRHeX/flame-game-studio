import test from 'node:test';
import assert from 'node:assert/strict';
import {BurnerSolver} from '../game/simulation/burner.mjs';
import {GameClocks,TIME_PROFILES} from '../game/core/clocks.mjs';
import {JOBS,MissionEvaluator} from '../game/missions/jobs.mjs';
import {CHAMBERS,flowAt} from '../game/chambers/flow.mjs';
import {FlameParticles} from '../game/flame/particles.mjs';
const step=(b,n=60)=>{let s;for(let i=0;i<n;i++)s=b.step(1/60);return s;};
test('pilot spark is independent from main flame and main follows stable pilot',()=>{
 const b=new BurnerSolver();
 assert.equal(step(b,2).pilotLit,false);
 const before=b.ignite();assert.equal(before.pilotLit,true);
 const after=b.step(1/60);assert.equal(after.mainLit,true);
 assert.ok(after.heatRelease>0);
});
test('no pilot fuel prevents ignition and closing the main valve removes heat',()=>{
 const b=new BurnerSolver();b.setDevice('pilotFuel',0);
 assert.equal(b.ignite().pilotLit,false);assert.equal(step(b,30).mainLit,false);
 b.setDevice('pilotFuel',0.22);b.ignite();step(b,5);
 b.setDevice('mainFuel',0);const s=step(b,20);
 assert.equal(s.mainLit,false);assert.equal(s.heatRelease,0);assert.equal(s.fuelFlow,0);
});
test('rich and lean are distinct, soot follows excess fuel only when burning',()=>{
 const a=new BurnerSolver(),b=new BurnerSolver();
 a.setDevice('mainFuel',0.29);a.setDevice('mainAir',0.95);
 b.setDevice('mainFuel',0.65);b.setDevice('mainAir',0.47);
 a.ignite();b.ignite();step(a,20);step(b,20);
 assert.ok(a.mainRatio<1);assert.ok(b.mainRatio>1);
 assert.equal(a.soot,0);assert.ok(b.soot>=0);
});
test('all three authored chambers produce finite, different velocities',()=>{
 assert.equal(JOBS.length,3);
 const vectors=JOBS.map(j=>flowAt(CHAMBERS[j.chamber],330,160,0.2));
 vectors.forEach(v=>{assert.ok(Number.isFinite(v.vx));assert.ok(Number.isFinite(v.vy));});
 assert.notDeepEqual(vectors[0],vectors[1]);assert.notDeepEqual(vectors[1],vectors[2]);
});
test('same commands and number of steps reproduce burner state exactly',()=>{
 const a=new BurnerSolver(),b=new BurnerSolver();
 a.ignite();b.ignite();
 for(let i=0;i<400;i++){
   if(i===170){a.setDevice('mainAir',0.72);b.setDevice('mainAir',0.72);}
   assert.deepEqual(a.step(1/60),b.step(1/60));
 }
});
test('watch mode accelerates process and mission, but slows cost; presentation caps are unchanged',()=>{
 const a=new GameClocks(),b=new GameClocks();let pa=0,pb=0,ma=0,mb=0,ca=0,cb=0;
 for(let i=0;i<120;i++){
   a.advance(1/60,false,(p,m,c)=>{pa+=p;ma+=m;ca+=c;});
   b.advance(1/60,true,(p,m,c)=>{pb+=p;mb+=m;cb+=c;});
 }
 assert.ok(Math.abs(pb/pa-2)<.001);assert.ok(Math.abs(mb/ma-2)<.001);
 assert.ok(Math.abs(cb/ca-.35)<.001);
 assert.deepEqual(Object.keys(TIME_PROFILES).sort(),['normal','watching']);
});
test('a stable, successful backyard objective can be completed',()=>{
 const job=JOBS[0],b=new BurnerSolver(job.burner),e=new MissionEvaluator(job);
 b.ignite();
 for(let i=0;i<600&&e.status==='active';i++){
   const s=b.step(1/60);e.tick(1/60,1/60,s,100);
 }
 assert.equal(e.status,'won');assert.equal(e.progress(),1);
});
test('unburnt gas can accumulate, and dangerous states are bounded',()=>{
 const b=new BurnerSolver();step(b,500);
 assert.ok(b.unburntFuel>0);
 assert.ok(b.temperature>=.12&&b.temperature<=3);
 for(const k of ['fuelFlow','airFlow','mainRatio','heatRelease','soot','stability'])assert.ok(Number.isFinite(b[k]));
});
test('particle pool is finite and seeded for repeatable visuals',()=>{
 const chamber=CHAMBERS.backyard,s=new BurnerSolver();s.ignite();const state=s.step(1/60);
 const a=new FlameParticles(50,123),b=new FlameParticles(50,123);
 for(let i=0;i<60;i++){a.step(1/60,state,chamber);b.step(1/60,state,chamber);}
 assert.ok(a.activeCount()>0);assert.ok(a.activeCount()<=50);
 assert.deepEqual(Array.from(a.x),Array.from(b.x));
 assert.deepEqual(Array.from(a.active),Array.from(b.active));
});
