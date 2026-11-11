// Independent observable checks for the visible renderer; no image snapshots supplied by the worker.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {FlameParticles} from '../../game/flame/particles.mjs';
import {CHAMBERS} from '../../game/chambers/flow.mjs';
const base=Object.freeze({pilotLit:true,mainLit:true,heatRelease:.65,stability:.96,soot:0,
 mainRatio:.97,temperature:1.1,fuelFlow:.7,airFlow:.9,pilotStability:.95,failed:false,events:[]});
function render(pool,state,chamber){
 const calls=[],stack=[];
 const ctx={fillStyle:'#123456',globalAlpha:1,globalCompositeOperation:'source-over',
  save(){stack.push([this.fillStyle,this.globalAlpha,this.globalCompositeOperation]);},
  restore(){[this.fillStyle,this.globalAlpha,this.globalCompositeOperation]=stack.pop();},
  clearRect(){throw Error('renderer erased caller chamber artwork');},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h,this.globalAlpha].every(Number.isFinite),'finite drawing geometry');
   assert.ok(w>=0&&h>=0&&this.globalAlpha>=0&&this.globalAlpha<=1,'valid pixel rectangle');
   assert.ok(!(w>=640&&h>=360),'no full-background replacement');
   calls.push([x,y,w,h,this.fillStyle,this.globalAlpha,this.globalCompositeOperation]);
  }};
 pool.draw(ctx,state,chamber);
 assert.equal(ctx.globalAlpha,1,'restore Canvas alpha');
 assert.equal(ctx.globalCompositeOperation,'source-over','restore Canvas composite mode');
 assert.equal(stack.length,0,'balanced Canvas state stack');
 return calls;
}
function warmed(state,chamber,seed=722){
 const pool=new FlameParticles(500,seed);
 for(let i=0;i<72;i++)pool.step(1/60,state,chamber);
 assert.ok(pool.activeCount()>0&&pool.activeCount()<=500);
 return pool;
}
for(const chamber of Object.values(CHAMBERS)){
 const a=warmed(base,chamber),b=warmed(base,chamber);
 assert.deepEqual(Array.from(a.x),Array.from(b.x),'seeded x replay');
 assert.deepEqual(Array.from(a.y),Array.from(b.y),'seeded y replay');
 const before=JSON.stringify({x:Array.from(a.x),y:Array.from(a.y),active:Array.from(a.active),seed:a.seed});
 const drawing=render(a,base,chamber);
 assert.ok(drawing.length>30,'visible main plume');
 assert.equal(JSON.stringify({x:Array.from(a.x),y:Array.from(a.y),active:Array.from(a.active),seed:a.seed}),before,'draw is presentation only');
 assert.ok(isDeepStrictEqual(render(a,base,chamber),drawing),'repeat drawing is deterministic');
 const off=Object.freeze({...base,pilotLit:false,mainLit:false,mainRatio:.62,heatRelease:0,soot:0});
 assert.ok(isDeepStrictEqual(render(a,off,chamber),drawing),'existing flame retains emission-time appearance at the same age');
 const previousCursor=a.cursor;
 a.step(1/60,off,chamber);
 assert.equal(a.cursor,previousCursor,'no new particles after shutoff');
 for(let i=0;i<120;i++)a.step(1/60,off,chamber);
 assert.equal(a.activeCount(),0,'flame tails extinguish');
 assert.equal(render(a,off,chamber).length,0,'extinguished renderer is transparent');
 const pilot=Object.freeze({...base,mainLit:false,heatRelease:0});
 const pilotDrawing=render(warmed(pilot,chamber),pilot,chamber);
 const extent=calls=>Math.max(...calls.map(([x,y,w,h])=>chamber.orientation==='updraft'?chamber.nozzle.y-y+h:x+w-chamber.nozzle.x));
 assert.ok(extent(pilotDrawing)<extent(drawing)*.65,'pilot must be substantially shorter than main flame');
 a.clear();assert.equal(a.activeCount(),0);
}
const palettes=[];
for(const [ratio,soot] of [[.65,0],[.97,0],[1.45,.8]]){
 const state=Object.freeze({...base,mainRatio:ratio,soot});
 const calls=render(warmed(state,CHAMBERS.backyard),state,CHAMBERS.backyard);
 palettes.push(JSON.stringify([...new Set(calls.map(c=>c[4]))].sort()));
}
assert.equal(new Set(palettes).size,3,'lean/stable/rich visual palettes differ');
const dark=new FlameParticles(32,2),off={...base,pilotLit:false,mainLit:false,heatRelease:0};
dark.spawnRemainder=3;dark.step(1/60,off,CHAMBERS.backyard);
assert.equal(dark.activeCount(),0,'shutdown discards residual emission');
for(const state of [{...base,mainRatio:.97,soot:1},
 {...base,mainLit:false,mainRatio:1.45,soot:1,heatRelease:0},{...base,mainRatio:1.45,soot:0}]){
 const pool=warmed(state,CHAMBERS.backyard);
 assert.equal(Array.from(pool.smoke).some(Boolean),false,'soot requires burning rich main fuel with actual solver soot');
}
const rich={...base,mainRatio:1.45,soot:1},smoke=new FlameParticles(1,91);
for(let i=0;i<100&&!smoke.smoke[0];i++)smoke.spawn(CHAMBERS.backyard,rich);
assert.equal(smoke.smoke[0],1,'rich combustion can emit soot');
function ageSmoke(fraction){
 while(smoke.life[0]<smoke.maxLife[0]*fraction){
  const dt=Math.min(.1,smoke.maxLife[0]*fraction-smoke.life[0]+1e-7);
  smoke.step(dt,off,CHAMBERS.backyard);
 }
 return render(smoke,off,CHAMBERS.backyard);
}
const earlySmoke=ageSmoke(.6),lateSmoke=ageSmoke(.95);
assert.ok(earlySmoke.length>0&&lateSmoke.length>0,'existing soot remains visible after shutdown');
assert.ok(Math.max(...lateSmoke.map(c=>c[5]))<Math.max(...earlySmoke.map(c=>c[5])),'lingering soot fades');
console.log('PASS ICE-FLAME-003: three chambers, emission colors, short pilot, shutdown, seeded replay, mixture palettes and soot eligibility/persistence/fade');
