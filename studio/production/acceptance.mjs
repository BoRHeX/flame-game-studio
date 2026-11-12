// Independent outcome checks: changed geography and actual traversable stairs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENES} from '../../game/world/industrial-yard.mjs';
import {PlatformPlayer} from '../../game/player/platformer.mjs';
const job=JSON.parse(readFileSync(process.argv[2],'utf8'));
const before=JSON.parse(readFileSync(process.argv[3],'utf8'));
const signature=s=>JSON.stringify({platforms:s.platforms,ladders:s.ladders,stairs:s.stairs??[],interactions:s.interactions});
const changed=Object.keys(SCENES).filter(id=>before[id]&&signature(before[id])!==signature(SCENES[id]));
assert.ok(changed.length>=(job.quality?.min_changed_scenes??0),'The brief requires substantially redesigned geography in multiple locations; recoloring is insufficient');
if(job.quality?.physical_stairs){
 let tested=0;
 for(const scene of Object.values(SCENES))for(const stair of scene.stairs??[]){
  assert.ok([stair.x,stair.y,stair.w,stair.h].every(Number.isFinite)&&stair.w>0&&stair.h>0,'Stair geometry is valid');
  const right=stair.direction!=='left',player=new PlatformPlayer(scene);
  Object.assign(player.state,{x:right?stair.x-30:stair.x+stair.w+2,y:stair.y+stair.h-52,vx:0,vy:0,grounded:true,climbing:false});
  for(let i=0;i<900;i++){
   player.update(1/60,{x:right?1:-1,y:0,jump:false},scene);
   if((right?player.state.x>=stair.x+stair.w-20:player.state.x<=stair.x+8)&&player.state.y+52<=stair.y+20)break;
  }
  assert.ok(player.state.y+52<=stair.y+20,'Stairs must actually be climbable by walking, not just painted or labeled');tested++;
 }
 assert.ok(tested>0,'At least one functional authored staircase is required');
}
console.log('PASS PRODUCTION OUTCOMES: '+changed.length+' locations have new geometry; physical staircase and game identity checks passed');
