import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENES,drawScene} from '../game/world/industrial-yard.mjs';
import {environmentAt} from '../game/world/parallax.mjs';
import {JOBS} from '../game/missions/jobs.mjs';
import {CHAMBERS} from '../game/chambers/flow.mjs';
import {ContractSession} from '../game/missions/contract-session.mjs';
import {validGameState} from '../game/persistence/game-state.mjs';
import {newGameSnapshot} from '../game/persistence/save-slots.mjs';

test('Monsoon Stack is a complete fourth playable, traversable scene',()=>{
 const job=JOBS.find(j=>j.id==='monsoon');
 assert.ok(job);
 assert.equal(job.chamber,'monsoon');
 assert.ok(CHAMBERS.monsoon);
 const scene=SCENES.monsoon;
 assert.equal(scene.theme,'monsoon');
 assert.equal(scene.ladders.length,3);
 assert.ok(scene.interactions.some(x=>x.type==='npc'));
 assert.ok(scene.interactions.some(x=>x.deviceId==='draft'));
 for(const id of ['spark','port','exit'])assert.ok(scene.interactions.some(x=>x.id===id));
});

test('storm gusts change the dimensionless process and freeze with reduced-motion visuals',()=>{
 const a=environmentAt('monsoon',0),b=environmentAt('monsoon',20);
 assert.equal(a.weather,'rain');
 assert.ok(a.wind>0.2);
 assert.notEqual(a.draftFactor,b.draftFactor);
 const scene=SCENES.monsoon;
 const collect=time=>{
  const pixels=[],ctx={fillStyle:'#000',save(){},restore(){},translate(){},scale(){},
   fillRect(x,y,w,h){pixels.push([x,y,w,h,this.fillStyle]);}};
  drawScene(ctx,scene,{camera:{x:0,y:0,width:768,height:1152},
   player:{x:180,y:2248,w:28,h:52,grounded:true,facing:1,vx:0,walkPhase:0},
   time,reducedMotion:true,process:{pilotLit:false,mainLit:false,devices:{}},selectedId:null});
  return pixels;
 };
 assert.deepEqual(collect(2),collect(9));
});

test('stack damper requires inspection, repair and positive travel beyond the stop',()=>{
 const s=new ContractSession('monsoon');
 assert.equal(s.limit('draft'),.58);
 assert.equal(s.repair('free-damper'),false);
 s.inspect();
 assert.equal(s.repair('free-damper'),true);
 assert.equal(s.limit('draft'),1);
 s.adjust('draft',.58,.59);
 assert.equal(s.adjusted,false);
 s.adjust('draft',.59,.72);
 assert.equal(s.adjusted,true);
 for(let n=0;n<35;n++)s.tick(1/60,{pilotLit:true,mainLit:true,failed:false,stability:.7},true);
 assert.equal(s.verified,true);
 assert.deepEqual(new ContractSession('monsoon',s.snapshot()).snapshot(),s.snapshot());
});

test('Monsoon Stack completion survives the v1 save-validation boundary',()=>{
 const s=newGameSnapshot();
 s.scene={id:'monsoon',stage:'mission',practice:false};
 s.player={x:180,y:2248,grounded:true,climbing:false,facing:1};
 s.controls={mode:'joystick',hand:'left'};
 s.economy={funds:110};
 s.progression={completed:['backyard','monsoon']};
 s.mission={jobId:'monsoon',missionTime:0,
  process:{devices:{pilotFuel:.2,pilotAir:.3,mainFuel:.35,mainAir:.60,draft:.58},
  pilotLit:false,mainLit:false,failed:false,time:0,unburntFuel:0,temperature:.12,
  heatRelease:0,stability:0,soot:0,pilotStability:0,mainRatio:0,fuelFlow:0,
  airFlow:0,peakTemperature:.12,overheatSeconds:0},
  evaluator:{elapsed:0,hold:0,status:'active'}};
 assert.equal(validGameState(s),true);
});
