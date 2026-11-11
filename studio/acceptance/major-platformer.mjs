import assert from 'node:assert/strict';
import {PlatformPlayer} from '../../game/player/platformer.mjs';
import {SCENES,VIEWPORT} from '../../game/world/industrial-yard.mjs';
const fixture={id:'qa',width:1200,height:2400,spawn:{x:105,y:2248},
 platforms:[{id:'ground',x:0,y:2300,w:1200,h:40},{id:'upper',x:40,y:1500,w:500,h:24}],
 ladders:[{id:'ladder',x:95,y:1500,w:50,h:800}],
 interactions:[{id:'board',type:'contracts',x:125,y:2250,icon:'▤',label:'Board'}]};
const p=new PlatformPlayer(fixture),idle={x:0,y:0,jump:false};
for(let i=0;i<8;i++)p.update(1/60,idle,fixture);
assert.equal(p.state.w,28);assert.equal(p.state.h,52);assert.equal(p.state.grounded,true);
const y=p.state.y;p.update(1/60,{...idle,jump:true},fixture);
assert.ok(p.state.y<y&&p.state.vy<0,'jump leaves platform under gravity');
for(let i=0;i<180;i++)p.update(1/60,{...idle,jump:true},fixture);
assert.ok(Math.abs(p.state.y-y)<2&&p.state.grounded,'holding jump does not auto-repeat');
p.setScene(fixture);for(let i=0;i<8;i++)p.update(1/60,idle,fixture);
const cameraBefore=p.camera(fixture,VIEWPORT);
for(let i=0;i<360;i++)p.update(1/60,{x:0,y:-1,jump:false},fixture);
assert.ok(p.state.y<fixture.spawn.y-650,'ladder reaches upper floor');
const cameraAfter=p.camera(fixture,VIEWPORT);
assert.ok(cameraAfter.y<cameraBefore.y-100,'camera follows vertical exploration');
for(const camera of [cameraBefore,cameraAfter])assert.ok(camera.x>=0&&camera.y>=0&&camera.x+camera.width<=fixture.width+1&&camera.y+camera.height<=fixture.height+1,'bounded camera');
p.setScene(fixture);assert.equal(p.nearby(fixture)?.id,'board','physical proximity interaction');
p.state.x=950;assert.equal(p.nearby(fixture),null,'remote equipment cannot be operated');
for(let i=0;i<800;i++)p.update(1/60,{x:1,y:0,jump:false},fixture);
assert.ok(p.state.x+p.state.w<=fixture.width+1&&p.state.x>=0,'horizontal bounds');
for(const id of Object.keys(SCENES)){
 p.setScene(SCENES[id]);const before=JSON.stringify(p.state);p.update(0,idle,SCENES[id]);assert.equal(JSON.stringify(p.state),before,'zero step is inert');
 for(let i=0;i<120;i++)p.update(1/60,idle,SCENES[id]);
 assert.ok([p.state.x,p.state.y,p.state.vx,p.state.vy].every(Number.isFinite),'finite state in '+id);
 assert.ok(p.state.y+p.state.h<=SCENES[id].height+1,'no falling through world');
}
console.log('PASS MAJOR PLATFORMER: landing, edge-trigger jump, climbing, vertical camera, proximity and scene resets');
