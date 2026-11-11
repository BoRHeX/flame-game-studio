// Pointer-to-movement contract for touch-first platform traversal.
// Quantized to the dominant axis so ladder climbing never dismounts accidentally.
export function thumbVector(dx,dy,radius,deadZone=0.17){
  if(![dx,dy,radius,deadZone].every(Number.isFinite)||radius<=0||deadZone<0||deadZone>=1)
    return {x:0,y:0};
  const distance=Math.hypot(dx,dy),travel=Math.min(1,distance/radius);
  if(travel<=deadZone)return {x:0,y:0};
  const amount=(travel-deadZone)/(1-deadZone);
  let x=dx/distance*amount,y=dy/distance*amount;
  if(Math.abs(y)>=Math.abs(x)*0.85)x=0;
  else y=0;
  return {x,y};
}
