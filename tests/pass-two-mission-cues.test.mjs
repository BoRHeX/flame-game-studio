import test from 'node:test';
import assert from 'node:assert/strict';
import {JOBS,MissionEvaluator} from '../game/missions/jobs.mjs';
import {BurnerSolver} from '../game/simulation/burner.mjs';
import {JOB_TEMPLATES,getJobTemplate,missionWarnings,missionOutcome} from '../game/missions/job-templates.mjs';
const tune={backyard:{},warehouse:{mainFuel:.44,mainAir:.60,draft:.60},'heat-hold':{mainFuel:.35,mainAir:.45,draft:.48}};
test('three mission specialist templates reference the authoritative jobs',()=>{
 assert.equal(JOB_TEMPLATES.length,3);
 for(const j of JOBS){const t=getJobTemplate(j.id);assert.strictEqual(t.job,j);assert.strictEqual(t.objective,j.objective);}
});
test('every contract remains winnable without perks and clears process warning after tuning',()=>{
 for(const job of JOBS){
  const b=new BurnerSolver(job.burner),e=new MissionEvaluator(job),t=getJobTemplate(job.id);
  for(const [key,val] of Object.entries(tune[job.id]))b.setDevice(key,val);
  b.ignite();
  for(let i=0;i<2500&&e.status==='active';i++)e.tick(1/60,1/60,b.step(1/60),100);
  assert.equal(e.status,'won','not winnable: '+job.id);
  assert.equal(missionOutcome(t,e.status).payout,job.payout);
  const warnings=missionWarnings(t,b.snapshot(),{money:100,elapsed:e.elapsed});
  assert.ok(!warnings.includes(t.cues.unlit),'unlit after winning '+job.id);
 }
});
test('warehouse draft warning and soot/heat diagnosis respond to real process conditions',()=>{
 const w=getJobTemplate('warehouse'),h=getJobTemplate('heat-hold');
 const state={failed:false,pilotLit:true,mainLit:true,stability:.8,temperature:1.7,soot:.3,devices:{draft:.48}};
 assert.ok(missionWarnings(w,state).includes('draft-restricted'));
 assert.ok(missionWarnings(h,state).includes('temperature-high'));
 assert.ok(missionWarnings(h,state).includes('soot-high'));
 assert.ok(missionWarnings(h,{...state,temperature:.2,soot:0}).includes('temperature-low'));
 assert.deepEqual(missionOutcome(w,'active'),null);
});
