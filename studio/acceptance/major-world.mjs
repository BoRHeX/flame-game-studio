import assert from 'node:assert/strict';
import {SCENES,VIEWPORT,drawScene} from '../../game/world/industrial-yard.mjs';
assert.equal(VIEWPORT.width,768);assert.ok(VIEWPORT.height>=1024);
const finite=(...values)=>values.every(Number.isFinite);
for(const id of ['hub','backyard','warehouse','heat-hold']){
 const s=SCENES[id];assert.ok(s&&s.id===id,'required authored scene '+id);
 assert.ok(s.width>=1200&&s.height>=2400,'taller explorable world');
 assert.ok(s.platforms.length>=4&&s.ladders.length>=3,'multiple floors and ladders');
 const levels=[...new Set(s.platforms.map(p=>p.y))];assert.ok(levels.length>=4,'four distinct floor heights');
 for(const p of s.platforms)assert.ok(p.id&&finite(p.x,p.y,p.w,p.h)&&p.w>0&&p.h>0&&p.x>=0&&p.x+p.w<=s.width&&p.y>=0&&p.y+p.h<=s.height,'bounded solid platform');
 for(const l of s.ladders)assert.ok(l.id&&finite(l.x,l.y,l.w,l.h)&&l.w>0&&l.h>0&&l.x>=0&&l.x+l.w<=s.width&&l.y>=0&&l.y+l.h<=s.height,'bounded ladder');
 const floor=s.platforms.reduce((a,b)=>a.y>b.y?a:b);
 assert.ok(floor.x<=30&&floor.w>=s.width-60,'lowest floor catches falls');
 assert.ok(s.platforms.some(p=>s.spawn.x+28>p.x&&s.spawn.x<p.x+p.w&&Math.abs(s.spawn.y+52-p.y)<=5),'player spawns on a floor');
 const graph=new Map(levels.map(y=>[y,new Set()]));
 for(const l of s.ladders){
  const ends=s.platforms.filter(p=>l.x+l.w>=p.x&&l.x<=p.x+p.w&&(Math.abs(p.y-l.y)<=30||Math.abs(p.y-(l.y+l.h))<=30));
  for(const a of ends)for(const b of ends)graph.get(a.y).add(b.y);
 }
 const seen=new Set([floor.y]),queue=[floor.y];
 while(queue.length)for(const y of graph.get(queue.shift()))if(!seen.has(y)){seen.add(y);queue.push(y);}
 assert.ok(seen.size>=4,'four floor heights connect through usable ladders');
 assert.equal(new Set(s.interactions.map(i=>i.id)).size,s.interactions.length,'unique interaction IDs');
 for(const i of s.interactions)assert.ok(i.id&&i.type&&finite(i.x,i.y)&&i.x>=0&&i.x<=s.width&&i.y>=0&&i.y<=s.height,'bounded interaction');
 const near=i=>Math.hypot(i.x-(s.spawn.x+14),i.y-(s.spawn.y+26))<=150;
 if(id==='hub'){
  for(const type of ['contracts','practice','workbench','npc'])assert.ok(s.interactions.some(i=>i.type===type),'hub station '+type);
  assert.ok(s.interactions.some(i=>i.type==='contracts'&&near(i)),'onboarding starts by the contract board');
 }else{
  for(const device of ['pilotFuel','pilotAir','mainFuel','mainAir','draft'])assert.ok(s.interactions.some(i=>i.id===device&&i.type==='device'&&i.deviceId===device),'actual device '+device);
  for(const type of ['ignition','observation'])assert.ok(s.interactions.some(i=>i.type===type&&near(i)),'spawn can use '+type);
  assert.ok(s.interactions.some(i=>i.type==='exit'),'return station');
 }
 const before=JSON.stringify(s),styles=new Set();let rects=0,depth=0;
 const ctx={canvas:{width:VIEWPORT.width,height:VIEWPORT.height},fillStyle:'#000',strokeStyle:'#000',globalAlpha:1,
  save(){depth++;},restore(){depth--;},translate(x,y){assert.ok(finite(x,y));},scale(){},setTransform(){},
  fillRect(x,y,w,h){assert.ok(finite(x,y,w,h));rects++;styles.add(String(this.fillStyle));},
  strokeRect(x,y,w,h){assert.ok(finite(x,y,w,h));},clearRect(){},fillText(){},
  beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},arc(){},rect(){},clip(){},
  measureText:t=>({width:String(t).length*8})};
 drawScene(ctx,s,{camera:{x:0,y:s.height-VIEWPORT.height,...VIEWPORT},
  player:{...s.spawn,w:28,h:52,vx:70,vy:0,grounded:true,climbing:false,facing:1,walkPhase:.4},time:1.2,selectedId:null,stage:id==='hub'?'hub':'mission',jobId:id});
 assert.equal(depth,0,'balanced drawing state');assert.equal(JSON.stringify(s),before,'rendering preserves authored world data');
 assert.ok(rects>=200&&rects<=20000,'detailed but bounded pixel rendering');
 assert.ok(styles.size>=16,'authored palette and material shading');
}
console.log('PASS MAJOR WORLD: four distinct tall scenes, reachable floors, hub stations, devices and detailed bounded pixel art');
