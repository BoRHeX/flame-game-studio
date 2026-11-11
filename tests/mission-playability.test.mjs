import test from 'node:test';
import assert from 'node:assert/strict';
import {BurnerSolver} from '../game/simulation/burner.mjs';
import {JOBS,MissionEvaluator} from '../game/missions/jobs.mjs';
const run=(jobId,tune,limit=2500)=>{
 const job=JOBS.find(j=>j.id===jobId),burner=new BurnerSolver(job.burner),objective=new MissionEvaluator(job);
 for(const [name,value] of Object.entries(tune))burner.setDevice(name,value);
 burner.ignite();
 let state;
 for(let n=0;n<limit&&objective.status==='active';n++){
   state=burner.step(1/60);
   objective.tick(1/60,1/60,state,100);
 }
 return {job,burner,objective,state};
};
test('all three proposed contracts have a no-upgrade success path',()=>{
 const examples=[
   ['backyard',{}],
   ['warehouse',{mainFuel:.44,mainAir:.60,draft:.60}],
   ['heat-hold',{mainFuel:.35,mainAir:.45,draft:.48}]
 ];
 for(const [name,tune] of examples){
   const {objective,state}=run(name,tune);
   assert.equal(objective.status,'won',name+' did not have a winning tune: '+JSON.stringify(state));
   assert.ok(objective.progress()>=1,name+' objective did not hold');
 }
});
test('improper air/fuel balance produces a genuine mission failure condition',()=>{
 const {objective,state}=run('backyard',{mainAir:0.01});
 assert.equal(objective.status,'failed');
 assert.equal(state.mainLit,false);
});
test('extreme stable firing can cause a persistent overheat failure',()=>{
 const b=new BurnerSolver();
 b.setDevice('mainFuel',.80);b.setDevice('mainAir',.90);b.setDevice('draft',.55);
 b.ignite();let last;
 for(let n=0;n<2500&&!b.failed;n++)last=b.step(1/60);
 assert.equal(b.failed,true,'high firing never reached overfire failure');
 assert.ok(last.temperature>1.58);
});
test('delayed pilot ignition after fuel accumulation is a distinct puff event',()=>{
 const b=new BurnerSolver();
 for(let n=0;n<350;n++)b.step(1/60);
 const result=b.ignite();
 assert.ok(result.events.includes('pilot.ignite'));
 assert.ok(result.events.includes('combustion.puff'));
});
