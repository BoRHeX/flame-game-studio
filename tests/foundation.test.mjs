import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BurnerSolver} from '../prototypes/flame-lab/simulation.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
test('foundation locks the two animation rates and independent watch clocks',()=>{
  const c=json('../memory/canonical/vision.json');
  assert.equal(c.world_fps,18);
  assert.equal(c.flame_fps,24);
  assert.equal(c.first_pass_missions,3);
  assert.equal(c.flame_is_authoritative,true);
  assert.equal(c.upgrades_required_to_beat_story,false);
  assert.equal(c.separate_experimental_studio_must_remain_unchanged,true);
});
test('money cannot accidentally activate paid workers through policy',()=>{
  const p=json('../studio/budget/policy.json');
  assert.equal(p.STUDIO_ENABLED,false);
  assert.equal(p.ENFORCEMENT_IMPLEMENTED,false);
  assert.ok(p.INITIAL_EXPERIMENT_CAP_USD<=50);
});
test('dedicated orchestra has all four specialist roles',()=>{
  const r=json('../studio/agents/roles.json').roles.map(x=>x.id);
  for(const id of ['composer_conductor','orchestrator_instrumentalist','sound_engineer','av_sync_director'])assert.ok(r.includes(id));
});
test('ignition responds to fuel and air; stable closure removes main heat',()=>{
  const b=new BurnerSolver();
  for(let i=0;i<50;i++)b.step(1/60);
  assert.equal(b.lit,false);
  b.control({spark:true});b.step(1/60);assert.equal(b.lit,true);
  b.control({spark:false,fuelValve:0});
  for(let i=0;i<20;i++)b.step(1/60);
  assert.equal(b.heatRelease,0);
  assert.equal(b.lit,false);
  assert.equal(b.fuelFlow,0);
});
test('unlit fuel accumulates and state remains bounded',()=>{
  const b=new BurnerSolver();
  for(let i=0;i<500;i++)b.step(1/60);
  assert.ok(b.unburntFuel>0);
  assert.ok(Number.isFinite(b.temperature));
  assert.ok(b.temperature>=0.12&&b.temperature<=3);
});
test('same inputs produce deterministic state sequences',()=>{
  const a=new BurnerSolver(),b=new BurnerSolver();
  for(let i=0;i<300;i++){
    const control={fuelValve:i>180?0.2:0.45,airDamper:i>100?0.55:0.50,spark:i===60};
    a.control(control);b.control(control);assert.deepEqual(a.step(1/60),b.step(1/60));
  }
});
test('lean and rich conditions lead to distinguishable ratio values',()=>{
  const a=new BurnerSolver(),b=new BurnerSolver();
  a.control({fuelValve:0.3,airDamper:0.9});
  b.control({fuelValve:0.95,airDamper:0.35});
  a.step(1/60);b.step(1/60);
  assert.ok(a.ratio<1);
  assert.ok(b.ratio>1);
});
