import assert from 'node:assert/strict';
import {BIOMES,environmentAt,drawParallax} from '../../game/world/parallax.mjs';
const ids=['hub','backyard','warehouse','heat-hold'];
for(const id of ids){
 assert.ok(BIOMES[id].layers.length>=3);const before=JSON.stringify(BIOMES);
 for(let t=0;t<25;t+=.2){const e=environmentAt(id,t);assert.deepEqual(e,environmentAt(id,t));for(const k of ['airflowFactor','draftFactor','heatLossFactor'])assert.ok(Number.isFinite(e[k])&&e[k]>=.75&&e[k]<=1.2);assert.ok(Math.abs(e.wind)<=1);}
 assert.equal(JSON.stringify(BIOMES),before);
 const camera={x:100,y:900,width:768,height:1152},protectedAreas=[{x:0,y:0,w:768,h:1152}],calls=[];let balance=0;
 const ctx={save(){balance++;},restore(){balance--;},fillStyle:'',globalAlpha:1,fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(w>=0&&h>=0);calls.push([x,y,w,h]);}};
 drawParallax(ctx,id,camera,12,{foreground:false});assert.ok(calls.length>10,'authored drawing '+id);assert.equal(balance,0);
 calls.length=0;drawParallax(ctx,id,camera,12,{foreground:true,protectedAreas});assert.equal(calls.filter(([x,y,w,h])=>x<768&&x+w>0&&y<1152&&y+h>0).length,0,'protected player/targets');assert.equal(balance,0);
}
assert.equal(new Set(ids.map(id=>JSON.stringify(BIOMES[id].layers))).size,4);
assert.notDeepEqual(environmentAt('backyard',1),environmentAt('backyard',8),'crosswind affects process');
assert.equal(environmentAt('hub',1).airflowFactor,1);assert.throws(()=>environmentAt('invalid',0));assert.throws(()=>environmentAt('hub',NaN));
console.log('PASS P2 ENVIRONMENT: four authored layered biomes, deterministic process weather and foreground target protection');
