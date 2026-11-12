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
const cold={mainLit:false,pilotLit:false,mainRatio:1,devices:{}};

test('backyard enclosed furnace inspection port follows pilot, main and rich process states',()=>{
 const off=frame(cold);
 const pilot=frame({...cold,pilotLit:true});
 const main=frame({...cold,mainLit:true});
 const rich=frame({...cold,mainLit:true,mainRatio:1.15});
 assert.notDeepEqual(pilot,off,'an unlit furnace must not look lit');
 assert.notDeepEqual(main,pilot,'pilot and main states must remain distinguishable');
 assert.notDeepEqual(rich,main,'rich combustion changes the observation-port light');
 assert.deepEqual(frame(cold),off,'drawing cannot latch a previous lit state');
});

test('reduced-motion world presentation is deterministic without locking artwork coordinates',()=>{
 const hot={...cold,mainLit:true};
 assert.notDeepEqual(frame(hot,3),frame(hot,9),'the living plant animates');
 assert.deepEqual(frame(hot,3,true),frame(hot,9,true),'reduced motion freezes presentation at a fixed process state');
});
