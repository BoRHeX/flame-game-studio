import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENES,drawScene} from '../game/world/industrial-yard.mjs';

// Capture the public renderer's world-space primitives at a fixed camera origin.
// These checks exercise the actual scene branch, rather than inspect helper names.
function frame(process,time=3,reducedMotion=false){
 const pixels=[];
 const ctx={fillStyle:'#000',globalAlpha:1,save(){},restore(){},translate(){},scale(){},
  fillRect(x,y,w,h){pixels.push({x,y,w,h,color:this.fillStyle});}};
 drawScene(ctx,SCENES.backyard,{camera:{x:0,y:0,width:768,height:1152},
  player:{...SCENES.backyard.spawn,w:28,h:52,vx:0,vy:0,facing:1,grounded:true,walkPhase:0},
  time,reducedMotion,process,contract:{repaired:false},selectedId:null});
 return pixels;
}
const inArea=(pixels,a)=>pixels.filter(r=>
 r.x<a.x+a.w&&r.x+r.w>a.x&&r.y<a.y+a.h&&r.y+r.h>a.y);
const cold={mainLit:false,pilotLit:false,mainRatio:1,devices:{}};

test('backyard enclosed furnace inspection port follows pilot, main and rich process states',()=>{
 const port={x:790,y:2005,w:130,h:100};
 const off=inArea(frame(cold),port);
 const pilot=inArea(frame({...cold,pilotLit:true}),port);
 const main=inArea(frame({...cold,mainLit:true}),port);
 const rich=inArea(frame({...cold,mainLit:true,mainRatio:1.15}),port);
 assert.notDeepEqual(pilot,off,'an unlit furnace must not look lit');
 assert.notDeepEqual(main,pilot,'pilot and main states must remain distinguishable');
 assert.notDeepEqual(rich,main,'rich combustion changes the observation-port light');
 assert.deepEqual(inArea(frame(cold),port),off,'drawing cannot latch a previous lit state');
});

test('connected backyard stack emits only when lit and freezes under reduced motion',()=>{
 const plume={x:1135,y:440,w:130,h:260};
 const off=inArea(frame(cold,3),plume);
 assert.deepEqual(inArea(frame(cold,9),plume),off,'unlit player stack has no animated exhaust');
 const hot={...cold,mainLit:true};
 assert.notDeepEqual(inArea(frame(hot,3),plume),off,'lit player stack has visible exhaust');
 assert.notDeepEqual(inArea(frame(hot,3),plume),inArea(frame(hot,9),plume),'exhaust moves with presentation time');
 assert.deepEqual(inArea(frame(hot,3,true),plume),inArea(frame(hot,9,true),plume),'reduced motion freezes the exhaust');
});
