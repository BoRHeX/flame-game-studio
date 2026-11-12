// Pure tactile control. The caller alone writes the authoritative device command.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class DeviceControl {
 constructor({kind='valve',value=0,min=0,max=1,detent=.025}={}){
  if(!['valve','damper'].includes(kind)||![value,min,max,detent].every(Number.isFinite)||min<0||max>1||min>max||detent<=0)throw new TypeError('invalid device control');
  this.kind=kind;this.min=min;this.max=max;this.detent=detent;this.value=clamp(value,min,max);this.pointer=null;
 }
 set(value){
  if(!Number.isFinite(value))throw new TypeError('invalid device position');
  const previous=this.value;this.value=clamp(value,this.min,this.max);
  return {value:this.value,changed:Math.abs(previous-this.value)>1e-8,detent:Math.floor(previous/this.detent)!==Math.floor(this.value/this.detent),atLimit:this.value===this.min||this.value===this.max};
 }
 nudge(direction,fine=false){if(!Number.isFinite(direction))throw new TypeError('invalid device travel');return this.set(this.value+direction*(fine ? .005 : this.detent));}
 begin(x,y,cx,cy){if(![x,y,cx,cy].every(Number.isFinite))throw new TypeError('invalid pointer');this.pointer={x,y,cx,cy,angle:Math.atan2(y-cy,x-cx)};}
 move(x,y){
  if(![x,y].every(Number.isFinite))throw new TypeError('invalid pointer');
  const p=this.pointer;if(!p)return this.set(this.value);
  let delta;
  if(this.kind==='damper')delta=(p.y-y)/180;
  else {
   const angle=Math.atan2(y-p.cy,x-p.cx);let d=angle-p.angle;
   if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;
   delta=d/(Math.PI*1.5);p.angle=angle;
   if(Math.hypot(x-p.cx,y-p.cy)<18)delta=0;
  }
  p.x=x;p.y=y;return this.set(this.value+clamp(delta,-.2,.2));
 }
 end(){this.pointer=null;}
}
