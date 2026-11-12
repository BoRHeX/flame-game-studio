// Original procedural pixel art; scenery does not affect collision or process state.
const layer=(kind,speedX,speedY,color,spacing)=>Object.freeze({kind,speedX,speedY,color,spacing});
const biome=(weather,palette,layers)=>Object.freeze({weather,palette:Object.freeze(palette),layers:Object.freeze(layers)});
export const BIOMES=Object.freeze({
  hub:biome('dust',{sky:'#293d4b',haze:'#405462',shadow:'#26383d',trim:'#82918a',light:'#ffe1a0'},[
    layer('roof',.08,.05,'#283842',240),layer('windows',.20,.12,'#364d56',190),layer('pipes',.36,.22,'#52656a',280)]),
  backyard:biome('wind',{sky:'#b36d76',haze:'#efaa89',shadow:'#173b37',trim:'#74a28c',light:'#ffe4a1'},[
    layer('coastal-ridge',.08,.04,'#866e79',240),layer('ocean',.12,.05,'#477f80',180),
    layer('far-canopy',.20,.09,'#426f60',210),layer('palms',.30,.13,'#285b4b',260),
    layer('near-canopy',.42,.20,'#153e35',170),layer('vines',.52,.24,'#102f2a',220)]),
  warehouse:biome('dust',{sky:'#222d39',haze:'#394755',shadow:'#202e35',trim:'#84908a',light:'#c6b78c'},[
    layer('trusses',.06,.04,'#263440',250),layer('bays',.17,.10,'#3b4a51',210),layer('ducts',.31,.19,'#58645f',260)]),
  'heat-hold':biome('haze',{sky:'#322f3d',haze:'#594c52',shadow:'#302e36',trim:'#a28d7b',light:'#ffd5a0'},[
    layer('stacks',.09,.05,'#3b363e',220),layer('vessels',.22,.13,'#56494a',250),layer('coils',.38,.23,'#76625b',180)])
});
function checkedBiome(id,time){
  if(typeof id!=='string'||!Object.prototype.hasOwnProperty.call(BIOMES,id)) throw new RangeError('Unknown biome');
  if(typeof time!=='number'||!Number.isFinite(time)||time<0) throw new RangeError('Invalid environment time');
  return BIOMES[id];
}
export function environmentAt(sceneId,time){
  const b=checkedBiome(sceneId,time);
  if(sceneId==='hub') return {wind:0,airflowFactor:1,draftFactor:1,heatLossFactor:1,weather:b.weather};
  if(sceneId==='backyard'){
    const phase=time%(200*Math.PI);
    const wind=.35+.22*Math.sin(phase*.27)+.10*Math.sin(phase*.71);
    return {wind,airflowFactor:1+wind*.08,draftFactor:1+wind*.10,heatLossFactor:1+wind*.12,weather:b.weather};
  }
  if(sceneId==='warehouse') return {wind:0,airflowFactor:.94,draftFactor:.88,heatLossFactor:.98,weather:b.weather};
  return {wind:.08,airflowFactor:1,draftFactor:1.02,heatLossFactor:1.12,weather:b.weather};
}
const mod=(n,m)=>{const r=n%m;return r<0?r+m:r;};
function paint(c,color,x,y,w,h,areas){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  if(w<=0||h<=0) return;
  if(areas&&areas.some(a=>x<a.x+a.w&&x+w>a.x&&y<a.y+a.h&&y+h>a.y)) return;
  c.fillStyle=color;c.fillRect(x,y,w,h);
}
// Cell identity follows the world, including across camera cell boundaries.
function cells(cam,spacing,speed,fn){
  const offset=cam.x*speed,first=Math.floor(offset/spacing)-2,rem=mod(offset,spacing);
  const count=Math.min(2048,Math.ceil(cam.width/spacing)+5);
  for(let j=0;j<count;j++) fn((j-2)*spacing-rem,first+j);
}
function disc(c,x,y,r,color){
  const inset=[.63,.36,.18,.05,.05,.18,.36,.63];
  for(let k=0;k<8;k++) paint(c,color,x-r+inset[k]*r,y+(k-4)*r/4,2*r-2*inset[k]*r,r/4+1);
}
function palm(c,x,y,s,shade,light){
  for(let k=0;k<7;k++) paint(c,shade,x+k*s*.025,y+k*s*.13,s*.075,s*.15);
  paint(c,light,x+s*.02,y+s*.25,s*.025,s*.36);
  for(const side of [-1,1]) for(let k=0;k<5;k++){
    const dx=side*(s*.08+k*s*.13),yy=y-s*.03+k*k*s*.024;
    paint(c,shade,x+dx-(side<0?s*.14:0),yy,s*.17,s*.065);
    paint(c,shade,x+dx-(side<0?s*.08:0),yy+s*.045,s*.055,s*(.13+k*.012));
    if(k<3) paint(c,light,x+dx-(side<0?s*.10:0),yy,s*.10,s*.018);
  }
  paint(c,shade,x-s*.05,y-s*.13,s*.13,s*.15);
}
function fern(c,x,y,s,color,light){
  paint(c,color,x,y-s,s*.035,s);
  for(let k=0;k<5;k++){
    const yy=y-s*.85+k*s*.15,len=s*(.14+k*.045);
    paint(c,color,x-len,yy,len*2+s*.03,s*.045);
    paint(c,light,x-len,yy-s*.035,len*.55,s*.025);
    paint(c,color,x-len,yy+s*.035,len*.18,s*.09);
    paint(c,color,x+len*.8,yy+s*.035,len*.18,s*.09);
  }
}
function coast(c,cam,time,reduced){
  const w=cam.width,h=cam.height;
  const sky=['#9b6878','#b8757b','#d88982','#e99b85','#f4b28e','#f9ca98','#f7d6a0'];
  for(let i=0;i<sky.length;i++) paint(c,sky[i],0,h*i*.10,w,h*.105+1);
  paint(c,'#f8c79b',0,h*.70,w,h*.30);
  const sx=w*.70-cam.x*.025,sy=h*.25-cam.y*.015;
  disc(c,sx,sy,71,'#efad8b');disc(c,sx,sy,53,'#ffd69a');disc(c,sx,sy,43,'#ffebb2');
  cells(cam,197,.035,(x,i)=>{
    const y=h*(.10+mod(i,3)*.065)-cam.y*.012;
    paint(c,mod(i,2)?'#d99489':'#e9a092',x,y,90+mod(i,3)*31,5);
    paint(c,'#f3b394',x+21,y+6,63,4);
  });
  const ridge=h*.46-cam.y*.04;
  cells(cam,240,.08,(x,i)=>{
    const v=mod(i*37,4);
    for(let k=0;k<8;k++){
      const top=ridge-24-Math.abs(3-k)*15-v*8;
      paint(c,'#866f7c',x+k*30,top,31,h-top+80);
      paint(c,'#a48183',x+k*30,top,30,4);
    }
  });
  const sea=h*.51-cam.y*.05;
  paint(c,'#52898a',0,sea,w,h-sea+100);paint(c,'#74a29a',0,sea,w,7);
  for(let j=0;j<18;j++){
    const y=sea+14+j*13,shift=mod(j*79-cam.x*.12,180);
    for(let k=-1;k<Math.min(256,Math.ceil(w/180)+1);k++)
      paint(c,j%3?'#679a96':'#83aaa0',k*180+shift,y,36+(j%4)*15,2);
    const spread=16+j*7,center=sx+mod(j*47,spread*2+1)-spread;
    paint(c,j%3?'#efc49e':'#ffe1aa',center-12-(j%4)*4,y,24+(j%4)*8,3);
    if(j%2===0) paint(c,'#d9b89b',center+38,y+4,18+j%5*5,2);
  }
  const shore=h*.68-cam.y*.09;
  cells(cam,210,.20,(x,i)=>{
    const v=mod(i*19,5);
    for(let k=0;k<7;k++){
      const top=shore-20-mod(i*7+k*13,5)*12-v*3;
      paint(c,'#426f60',x+k*30,top,31,h-top+80);
      paint(c,'#638b76',x+k*30+3,top+3,20,4);
    }
  });
  const palmBase=h*.79-cam.y*.13;
  cells(cam,260,.30,(x,i)=>{
    const v=mod(i*23,5);
    palm(c,x+60,palmBase-100-v*13,115+v*9,'#285b4b','#4a8066');
    palm(c,x+192,palmBase-65-v*7,82+v*4,'#316650','#58876a');
  });
  // A distant plant stack and restrained plume, frozen under reduced motion.
  const stackX=920-cam.x*.25,stackTop=h*.50-cam.y*.11;
  paint(c,'#4e6560',stackX,stackTop,26,170);
  paint(c,'#8b8e78',stackX+4,stackTop+6,4,150);
  paint(c,'#354d49',stackX-5,stackTop-8,36,12);
  const drift=reduced?0:time%12;
  for(let i=0;i<5;i++){
    const rise=mod(i*26+drift*7,130),x=stackX+8+rise*.20,y=stackTop-12-rise;
    paint(c,'rgba(103,103,99,0.22)',x,y,15+rise*.12,9);
    paint(c,'rgba(235,182,155,0.18)',x+5,y-5,14+rise*.08,6);
  }
  const front=h*.87-cam.y*.20;
  cells(cam,170,.42,(x,i)=>{
    const top=front-mod(i*17,5)*9;
    paint(c,'#153e35',x,top+28,171,h-top+100);
    for(let k=0;k<5;k++){
      const yy=top-mod(i*13+k*11,5)*9;
      paint(c,'#1c5140',x+k*34,yy,37,45);paint(c,'#2d684e',x+k*34+5,yy+5,20,4);
    }
    fern(c,x+35,top+47,53,'#194c3c','#478064');fern(c,x+122,top+49,42,'#194c3c','#478064');
  });
  cells(cam,220,.52,(x,i)=>{
    const y=h*.91-cam.y*.24-mod(i*29,4)*10;
    fern(c,x+30,y+45,58,'#102f2a','#286149');
    paint(c,'#163c31',x+160,y-65,4,94);
    for(let k=0;k<4;k++){
      paint(c,'#245841',x+164,y-57+k*19,19,5);paint(c,'#245841',x+145,y-47+k*19,15,5);
    }
  });
}
function interior(c,id,cam,b){
  const w=cam.width,h=cam.height,p=b.palette;
  paint(c,p.sky,0,0,w,h);paint(c,p.haze,0,h*.38,w,h*.62);
  for(let n=0;n<b.layers.length;n++){
    const l=b.layers[n],base=h*(.42+n*.14)-cam.y*l.speedY;
    cells(cam,l.spacing,l.speedX,(x,i)=>{
      const y=base-mod(i,3)*25;
      if(id==='hub'){
        if(n===0){
          paint(c,l.color,x,y-80,220,150);paint(c,p.trim,x+8,y-76,180,6);paint(c,p.shadow,x+155,y-130,32,55);
        }else if(n===1){
          // Workshop openings frame a miniature view of the same coast.
          paint(c,l.color,x,y,175,200);paint(c,p.shadow,x+22,y+22,120,92);
          paint(c,'#d99580',x+28,y+28,108,32);paint(c,'#f4c495',x+28,y+60,108,17);
          disc(c,x+106,y+53,10,'#ffe5a9');
          paint(c,'#8e7d7d',x+28,y+69,30,8);paint(c,'#a28480',x+38,y+66,24,4);
          paint(c,'#61918a',x+28,y+77,108,25);paint(c,'#dfb998',x+91,y+82,27,3);
          paint(c,'#dfb998',x+98,y+89,19,2);
          paint(c,'#315d4c',x+28,y+96,108,12);
          paint(c,'#24503f',x+39,y+88,4,19);paint(c,'#24503f',x+30,y+87,22,4);
          paint(c,p.shadow,x+78,y+28,7,80);paint(c,p.shadow,x+28,y+65,108,6);
          paint(c,'#bc9b75',x+20,y+112,124,5);
        }else{
          paint(c,l.color,x,y,240,20);paint(c,p.trim,x,y+3,240,3);paint(c,l.color,x+60,y-75,20,90);
          paint(c,p.light,x+130,y+34,20,7);paint(c,'rgba(255,211,137,0.08)',x+110,y+41,60,70);
        }
      }else if(id==='warehouse'){
        if(n===0){
          paint(c,l.color,x,y-100,220,18);paint(c,l.color,x+15,y-100,12,150);
          paint(c,p.trim,x+20,y-73,120,4);paint(c,p.shadow,x+130,y-94,10,85);
        }else if(n===1){
          paint(c,l.color,x,y,190,220);paint(c,p.shadow,x+12,y+14,166,150);
          for(let k=0;k<6;k++) paint(c,p.trim,x+20,y+28+k*20,150,3);
          paint(c,l.color,x+90,y+14,6,150);
        }else{
          paint(c,l.color,x,y,230,32);paint(c,p.trim,x,y+4,230,4);paint(c,p.shadow,x+80,y-4,12,40);
          paint(c,l.color,x+130,y+30,28,120);paint(c,p.shadow,x+124,y+75,40,10);
        }
      }else{
        if(n===0){
          paint(c,l.color,x+45,y-125,65,210);paint(c,p.shadow,x+37,y-130,82,12);paint(c,p.trim,x+52,y-110,6,155);
        }else if(n===1){
          paint(c,p.shadow,x+16,y-25,180,220);paint(c,l.color,x+23,y-18,166,206);
          for(let k=0;k<4;k++){paint(c,p.trim,x+23,y+12+k*44,166,5);paint(c,p.shadow,x+35,y+20+k*44,5,5);}
          paint(c,p.light,x+84,y+63,38,8);
        }else{
          paint(c,l.color,x,y,150,16);paint(c,l.color,x+136,y,14,90);paint(c,l.color,x+25,y+75,125,15);
          paint(c,p.trim,x+8,y+3,120,3);paint(c,p.shadow,x+56,y-5,9,26);
        }
      }
    });
  }
}
function protectedRects(options){
  if(options.protectedAreas===undefined) return [];
  if(!Array.isArray(options.protectedAreas)) throw new TypeError('Invalid protected areas');
  for(const a of options.protectedAreas){
    if(!a||![a.x,a.y,a.w,a.h].every(Number.isFinite)||a.w<0||a.h<0||!Number.isFinite(a.x+a.w)||!Number.isFinite(a.y+a.h))
      throw new RangeError('Invalid protected area');
  }
  return options.protectedAreas.filter(a=>a.w>0&&a.h>0);
}
function weather(ctx,id,camera,time,options,areas){
  const w=camera.width,h=camera.height;
  if(w<=0||h<=0) return;
  const t=options.reducedMotion?0:time;
  const wind=id==='backyard'?environmentAt(id,t).wind:0,gust=wind>.48;
  const count=id==='backyard'?36:id==='heat-hold'?24:20,drift=t%1000000;
  for(let i=0;i<count;i++){
    const x=mod(i*127+drift*(id==='backyard'?24:4)-camera.x*.2,w);
    const y=mod(i*83+drift*(id==='backyard'?12:-3)-camera.y*.1,h);
    if(id==='backyard'){
      paint(ctx,'rgba(218,224,207,0.35)',x,y,12+i%9+(gust?12:0),2,areas);
      paint(ctx,'rgba(218,224,207,0.22)',x+5,y+3,5+(gust?8:0),2,areas);
      if(gust&&i%6===0) paint(ctx,'rgba(235,235,215,0.32)',x+16,y-4,24,2,areas);
    }else if(id==='heat-hold'){
      paint(ctx,'rgba(241,169,112,0.10)',x,y,30+i%16,8,areas);
      paint(ctx,'rgba(255,210,160,0.10)',x+5,y+8,20,3,areas);
      paint(ctx,'rgba(241,169,112,0.08)',x-3,y+11,26,5,areas);
    }else{
      paint(ctx,id==='hub'?'rgba(255,220,158,0.28)':'rgba(184,196,190,0.22)',x,y,2+i%2,2+i%2,areas);
    }
  }
}
export function drawParallax(ctx,sceneId,camera,time,options={}){
  const b=checkedBiome(sceneId,time);
  if(!camera||![camera.x,camera.y,camera.width,camera.height].every(Number.isFinite)||camera.width<0||camera.height<0)
    throw new RangeError('Invalid camera');
  if(!options||typeof options!=='object') throw new TypeError('Invalid options');
  const areas=options.foreground?protectedRects(options):null;
  ctx.save();
  try{
    if(options.foreground) weather(ctx,sceneId,camera,time,options,areas);
    else if(sceneId==='backyard') coast(ctx,camera,time,!!options.reducedMotion);
    else interior(ctx,sceneId,camera,b);
  }finally{ctx.restore();}
}
