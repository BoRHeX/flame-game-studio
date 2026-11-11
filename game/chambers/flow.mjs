// Scripted virtual-pipe flow fields: no CFD or pairwise particle collisions.
export const CHAMBERS=Object.freeze({
  backyard:{id:'backyard',color:'#1c2836',portY:169,orientation:'horizontal',
    nozzle:{x:94,y:174},flowSpeed:1,recirculation:0.1,wind:0,baffle:0.0,chimney:0.25},
  warehouse:{id:'warehouse',color:'#222731',portY:168,orientation:'horizontal',
    nozzle:{x:88,y:185},flowSpeed:0.76,recirculation:0.37,wind:-0.17,baffle:0.55,chimney:0.15},
  'heat-hold':{id:'heat-hold',color:'#231d27',portY:192,orientation:'updraft',
    nozzle:{x:310,y:277},flowSpeed:0.65,recirculation:0.15,wind:0.08,baffle:0.23,chimney:0.90}
});
export function flowAt(chamber,x,y,seed=0,out){
  const horizontal=chamber.orientation==='horizontal';
  const progress=horizontal?x/640:(360-y)/360;
  const swirl=Math.sin((horizontal?y:x)*0.04+progress*8+seed)*chamber.recirculation*24;
  const baffle=chamber.baffle>0&&x>320&&y<195?chamber.baffle*24:0;
  const thrust=(230+progress*95)*chamber.flowSpeed;
  if(out===undefined)out={};
  if(horizontal){
    out.vx=thrust-baffle+chamber.wind*14;
    out.vy=swirl+(y-chamber.portY)*-0.014;
  }else{
    out.vx=swirl+chamber.wind*11;
    out.vy=-thrust-baffle;
  }
  return out;
}
