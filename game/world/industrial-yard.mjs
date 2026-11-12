// Original procedural pixel art; no external image assets or simulation state.
export const VIEWPORT = Object.freeze({width:768,height:1152});

const levels = [2300, 1840, 1380, 920];
function geometry() {
  return {
    platforms: levels.map((y,i)=>({id:'floor-'+i,x:i?80:0,y,w:i?1440:1600,h:20})),
    ladders: [
      {id:'ladder-0',x:410,y:1840,w:48,h:460},
      {id:'ladder-1',x:1040,y:1380,w:48,h:460},
      {id:'ladder-2',x:490,y:920,w:48,h:460}
    ]
  };
}
const station = (id,type,x,y,icon,label,deviceId) => ({id,type,x,y,icon,label,...(deviceId?{deviceId}:{})});
function scene(id,theme,interactions) {
  return {id,width:1600,height:2500,spawn:{x:180,y:2248},...geometry(),interactions,theme};
}
function jobStations(jobId) {
  const placements={
   backyard:{x:750,y:1348},
   warehouse:{x:930,y:888},
   'heat-hold':{x:1130,y:1808}
  };
  const operator=placements[jobId];
  return [
    station('spark','ignition',150,2268,'spark','Ignition'),
    station('port','observation',245,2268,'port','Observation port'),
    station('exit','exit',70,2268,'exit','Return to workshop'),
    station('pilotFuel','device',650,2268,'valve','Pilot fuel','pilotFuel'),
    station('pilotAir','device',820,1808,'damper','Pilot air','pilotAir'),
    station('mainFuel','device',1200,1808,'valve','Main fuel','mainFuel'),
    station('mainAir','device',700,1348,'damper','Main air','mainAir'),
    station('draft','device',1000,888,'damper','Draft','draft'),
    station('site-operator','npc',operator.x,operator.y,'operator','Site operator')
  ];
}
export const SCENES = {
  hub:scene('hub','workshop',[
    station('contracts','contracts',235,2268,'board','Contract board'),
    station('practice','practice',670,2268,'port','Home burner'),
    station('workbench','workbench',980,1808,'tools','Equipment bench'),
    station('npc','npc',1200,1348,'operator','Workshop operator')
  ]),
  backyard:scene('backyard','yard',jobStations('backyard')),
  warehouse:scene('warehouse','warehouse',jobStations('warehouse')),
  'heat-hold':scene('heat-hold','heater',jobStations('heat-hold'))
};

const palettes = {
  workshop:{sky:'#293d4b',haze:'#405462',far:'#283842',mid:'#364d56',wall:'#52656a',trim:'#82918a',accent:'#d29852',light:'#ffe1a0'},
  yard:{sky:'#536774',haze:'#819096',far:'#45575b',mid:'#596b69',wall:'#728078',trim:'#a3a99a',accent:'#d78043',light:'#ffe5a3'},
  warehouse:{sky:'#222d39',haze:'#394755',far:'#263440',mid:'#3b4a51',wall:'#58645f',trim:'#84908a',accent:'#bd7945',light:'#efcf8c'},
  heater:{sky:'#322f3d',haze:'#594c52',far:'#3b363e',mid:'#56494a',wall:'#76625b',trim:'#a28d7b',accent:'#d07a48',light:'#ffd5a0'}
};
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function rivets(c,x,y,w,spacing=32) {
  for(let a=x+8;a<x+w-3;a+=spacing){rect(c,'#25343a',a,y,4,4);rect(c,'#a4aaa0',a,y,2,2);}
}
function panel(c,x,y,w,h,base='#566b6c') {
  rect(c,'#1d2c31',x,y,w,h);rect(c,base,x+4,y+4,w-8,h-8);
  rect(c,'#889690',x+6,y+6,w-12,3);rect(c,'#34474a',x+6,y+h-9,w-12,3);
  rivets(c,x+4,y+10,w-8);rivets(c,x+4,y+h-13,w-8);
}
function pipe(c,x,y,w,h) {
  rect(c,'#202f35',x-3,y-3,w+6,h+6);rect(c,'#617779',x,y,w,h);
  if(w>h){rect(c,'#a2aba0',x,y+3,w,4);rect(c,'#354c50',x,y+h-6,w,4);}
  else {rect(c,'#a2aba0',x+3,y,4,h);rect(c,'#354c50',x+w-6,y,4,h);}
}
function wheel(c,x,y,r=18) {
  rect(c,'#25353a',x-r-3,y-r-3,r*2+6,r*2+6);
  rect(c,'#b66d46',x-r,y-r,r*2,r*2);rect(c,'#e2a76a',x-r+4,y-r+4,r*2-8,r*2-8);
  rect(c,'#34474a',x-r+8,y-r+8,r*2-16,r*2-16);
  rect(c,'#d48651',x-3,y-r,6,r*2);rect(c,'#d48651',x-r,y-3,r*2,6);
  rect(c,'#e4b37a',x-4,y-4,8,8);
}
function lamp(c,x,y,p) {
  rect(c,'#25343a',x-3,y-27,6,24);rect(c,'#243339',x-18,y-5,36,10);
  rect(c,p.accent,x-13,y+5,26,5);rect(c,p.light,x-9,y+10,18,7);
  rect(c,'rgba(255,211,137,0.07)',x-35,y+17,70,65);
}
function windowPane(c,x,y,w,h,lit) {
  rect(c,'#23343b',x,y,w,h);rect(c,lit?'#bfaa79':'#527079',x+5,y+5,w-10,h-10);
  rect(c,lit?'#ead09a':'#779097',x+9,y+9,w-18,5);
  rect(c,'#344a4e',x+w/2-3,y+4,6,h-8);rect(c,'#344a4e',x+4,y+h/2-3,w-8,6);
}
function background(c,s,v,p) {
  const cam=v.camera, w=cam.width,h=cam.height;
  rect(c,p.sky,0,0,w,h);
  rect(c,p.haze,0,h*.28,w,h*.72);
  // Parallax coordinates are screen-space and independent of collision.
  const ox=cam.x*.13, oy=cam.y*.08;
  rect(c,'#c6b995',570-ox,110-oy,76,76);
  rect(c,p.haze,558-ox,166-oy,98,28);
  for(let i=-2;i<14;i++){
    const x=i*158-(ox%158), top=h*.34-(i%3+3)%3*42-oy;
    rect(c,p.far,x,top,120,h-top);
    rect(c,p.far,x+28,top-90,20,90);
    rect(c,'#70817d',x+32,top-94,12,5);
    for(let j=0;j<4;j++)rect(c,'#73827d',x+16+j*24,top+35,8,4);
  }
  const mx=cam.x*.3,my=cam.y*.18;
  for(let i=-2;i<11;i++){
    const x=i*220-(mx%220),y=h*.57-(i%2)*65-my;
    rect(c,p.mid,x,y,195,h-y);rect(c,'#263a40',x+8,y+12,179,5);
    for(let k=0;k<4;k++)windowPane(c,x+18+k*42,y+34,25,44,false);
  }
  // Restrained drifting weather; purely atmospheric.
  if(s.id==='yard'||s.id==='heat-hold'){
    const t=Number.isFinite(v.time)?v.time:0;
    for(let i=0;i<36;i++){
      const x=((i*127+Math.floor(t*11)-cam.x*.2)% (w+50)+w+50)%(w+50)-25;
      const y=((i*83+Math.floor(t*17)-cam.y*.1)%(h+30)+h+30)%(h+30);
      rect(c,'rgba(218,224,207,0.28)',x,y,s.id==='yard'?2:5,s.id==='yard'?13:2);
    }
  }
}
function structure(c,s,p) {
  // The workshop shell and the three job sites share a scale, not collision.
  if(s.id==='hub'){
    rect(c,'#26383d',105,630,1370,1650);rect(c,p.wall,130,660,1320,1620);
    rect(c,'#283a3d',90,620,1400,45);rect(c,p.trim,115,628,1350,9);
    for(let x=160;x<1400;x+=155){rect(c,'#3c5050',x,670,8,1600);rect(c,'#71817a',x+8,670,3,1600);}
    for(let y=760;y<2200;y+=320)for(let x=210;x<1350;x+=300)windowPane(c,x,y,108,100,(x+y)%3===0);
    // Roof sawtooth, chimney and domestic upper loft.
    for(let x=145;x<1450;x+=110){rect(c,'#182b32',x,580,105,40);rect(c,'#78908b',x+8,588,80,8);}
    pipe(c,1250,290,68,335);panel(c,1200,270,170,50,'#697b79');
  }else if(s.id==='warehouse'){
    rect(c,'#303e42',55,580,1490,1710);rect(c,p.wall,80,620,1440,1650);
    for(let x=100;x<1500;x+=135){rect(c,'#36484a',x,620,12,1650);rect(c,'#82908a',x+12,620,3,1650);}
    for(let y=730;y<2180;y+=290){rect(c,'#293d40',90,y,1420,16);for(let x=180;x<1400;x+=310)windowPane(c,x,y+38,120,95,false);}
    for(let y=2030;y<2240;y+=30)rect(c,'#87958d',1130,y,260,4);
    panel(c,1110,1990,300,300,'#465954');
    for(let y=2020;y<2250;y+=26)rect(c,'#84918a',1120,y,280,4);
  }else if(s.id==='heat-hold'){
    // Tall insulated heater with bands, inspection ports and chimney.
    pipe(c,780,210,92,700);panel(c,570,500,510,1730,'#74635b');
    rect(c,'#3a4140',600,540,450,1660);rect(c,'#8c7665',615,550,420,1635);
    for(let y=620;y<2150;y+=190){rect(c,'#4e5551',600,y,450,22);rect(c,'#b2a08a',610,y+3,430,4);rivets(c,610,y+8,430,36);}
    for(let y=760;y<2000;y+=420){panel(c,715,y,230,150,'#434d4b');rect(c,'#1a2a30',765,y+30,130,90);rect(c,'#718583',775,y+40,110,8);}
    pipe(c,450,1000,115,34);pipe(c,1080,1560,260,42);
  }else{
    rect(c,'#4b5d59',110,1050,1380,1200);
    for(let x=120;x<1500;x+=75){rect(c,'#718178',x,1050,5,1200);rect(c,'#364b49',x+55,1050,5,1200);}
    // Horizontal outdoor boiler, supported independently of the platforms.
    panel(c,520,1660,730,360,'#788782');
    rect(c,'#354d4e',550,1695,670,290);rect(c,'#9ca99b',565,1710,640,260);
    for(let x=620;x<1200;x+=130){rect(c,'#536b69',x,1710,9,260);rivets(c,x-4,1730,30,12);}
    pipe(c,1130,1180,70,480);pipe(c,1190,1180,170,34);
    panel(c,620,2000,80,220,'#536863');panel(c,1060,2000,80,220,'#536863');
  }
  // Authored pipe network, flanges, conduit and lamps across all floors.
  pipe(c,130,1100,34,1000);pipe(c,130,1090,1200,30);
  pipe(c,1300,1100,34,930);pipe(c,170,1530,950,24);
  for(let y=1200;y<2200;y+=250){panel(c,116,y,62,30,'#6b7d79');panel(c,1284,y,62,30,'#6b7d79');}
  for(let y=780;y<2300;y+=460)for(let x=300;x<1500;x+=450)lamp(c,x,y,p);
}
function deck(c,p) {
  // Grating and railings are art drawn from, but never written into, collision data.
  rect(c,'#233438',p.x,p.y,p.w,p.h+9);rect(c,'#879890',p.x,p.y,p.w,5);
  rect(c,'#4a6060',p.x,p.y+6,p.w,12);
  for(let x=p.x+10;x<p.x+p.w-8;x+=22){rect(c,'#263d3e',x,p.y+8,13,5);rect(c,'#a4afa0',x,p.y+14,3,2);}
  if(p.y<2300){
    rect(c,'#354c4b',p.x,p.y-83,p.w,7);rect(c,'#83928a',p.x,p.y-84,p.w,3);
    rect(c,'#4a605d',p.x,p.y-43,p.w,5);
    for(let x=p.x+12;x<p.x+p.w;x+=80){rect(c,'#415653',x,p.y-83,6,83);rect(c,'#a0a99a',x+1,p.y-78,2,4);}
  }else{
    for(let x=0;x<p.w;x+=100){rect(c,'#647875',x,p.y+22,92,3);rect(c,'#263a3d',x+45,p.y+25,4,18);}
  }
}
function ladder(c,l) {
  rect(c,'#24383a',l.x-3,l.y,l.w+6,l.h);rect(c,'#778b80',l.x,l.y,7,l.h);rect(c,'#526c65',l.x+l.w-7,l.y,7,l.h);
  for(let y=l.y+12;y<l.y+l.h;y+=24){rect(c,'#a2ab96',l.x+6,y,l.w-12,5);rect(c,'#344e49',l.x+6,y+5,l.w-12,3);}
}
function machine(c,x,y,kind,selected,time) {
  const top=y-100;
  if(kind==='contracts'){
    panel(c,x-65,top-8,130,100,'#8b684d');
    for(let i=0;i<3;i++){rect(c,'#d6c59b',x-49+i*34,top+12,26,55);rect(c,'#647774',x-45+i*34,top+21,18,4);rect(c,'#bd764e',x-43+i*34,top+34,12,12);rect(c,'#e7d8ad',x-38+i*34,top+3,5,8);}
  }else if(kind==='workbench'){
    rect(c,'#273a3c',x-75,y-50,150,12);rect(c,'#a48d70',x-72,y-56,144,8);
    rect(c,'#4c605e',x-60,y-38,10,38);rect(c,'#4c605e',x+50,y-38,10,38);
    panel(c,x-55,y-125,110,65,'#425956');
    for(let i=0;i<5;i++){rect(c,'#c5c4aa',x-42+i*20,y-115,4,30);rect(c,'#b2764f',x-46+i*20,y-90,12,5);}
    rect(c,'#84918a',x-22,y-70,44,14);rect(c,'#d0aa72',x-10,y-77,20,7);
  }else if(kind==='npc'){
    operator(c,{x:x-14,y:y-52,w:28,h:52,vx:0,grounded:true,climbing:false,facing:-1,walkPhase:time*.4},true);
  }else if(kind==='exit'){
    panel(c,x-29,y-92,58,92,'#46615e');rect(c,'#192c30',x-19,y-80,38,65);rect(c,'#d7b77c',x+8,y-50,5,7);
  }else{
    pipe(c,x-9,y-140,18,90);
    panel(c,x-40,y-85,80,78,kind==='practice'?'#8a6b58':'#5f7772');
    if(kind==='device')wheel(c,x,y-46,17);
    else if(kind==='ignition'){
      rect(c,'#2b3838',x-20,y-67,40,40);rect(c,'#d59552',x-11,y-58,22,22);rect(c,'#f5d58e',x-5,y-52,10,10);
    }else{
      rect(c,'#1b3036',x-25,y-70,50,43);rect(c,'#829b95',x-19,y-64,38,31);rect(c,'#2a4449',x-15,y-60,30,23);
      rect(c,'#b5c3ad',x-12,y-57,13,3);
    }
  }
  if(selected){rect(c,'#f5d18a',x-30,y-145,60,4);rect(c,'#f5d18a',x-30,y-145,4,18);rect(c,'#f5d18a',x+26,y-145,4,18);}
}
function operator(c,p,npc=false) {
  const x=Math.round(p.x),y=Math.round(p.y),w=p.w||28,h=p.h||52;
  const moving=p.climbing||Math.abs(p.vx||0)>2;
  const step=moving?Math.round(Math.sin(p.walkPhase||0)*4):0;
  const scaleX=w/28,scaleY=h/52;
  c.save();c.translate(x,y);c.scale(scaleX,scaleY);
  if(p.facing<0){c.translate(28,0);c.scale(-1,1);}
  // Boots, articulated legs, coverall, reflective stripes, gloves, helmet and visor.
  rect(c,'#17272c',3,43+step,10,9-step);rect(c,'#17272c',16,43-step,10,9+step);
  rect(c,'#334e55',5,31,8,16+step);rect(c,'#334e55',16,31,8,16-step);
  rect(c,'#d8bf75',5,37,8,3);rect(c,'#d8bf75',16,37,8,3);
  rect(c,'#1f343a',4,18,21,18);rect(c,npc?'#a16d4c':'#63828a',6,19,17,17);
  rect(c,'#d9c68d',6,27,17,3);rect(c,'#e7d6a4',7,27,15,1);
  rect(c,'#344e54',1,20,5,15+(p.climbing?step:0));rect(c,'#344e54',23,20,5,15-(p.climbing?step:0));
  rect(c,'#c1a882',1,33+(p.climbing?step:0),5,4);rect(c,'#c1a882',23,33-(p.climbing?step:0),5,4);
  rect(c,'#342f2b',7,8,15,12);rect(c,'#bb936e',9,10,12,9);
  rect(c,'#243b40',6,2,18,9);rect(c,npc?'#d39b59':'#d4c68c',7,1,16,7);
  rect(c,'#f2dfaa',10,2,9,2);rect(c,'#a18355',5,8,21,3);
  rect(c,'#335861',13,10,10,5);rect(c,'#a6c3bd',15,10,7,2);
  rect(c,'#e7d5a3',8,21,3,4);rect(c,'#263d42',17,21,5,4);
  c.restore();
}
function machinery(c,s,v) {
  // Decorative fan motion conveys machinery, not combustion state.
  const t=Number.isFinite(v.time)?v.time:0;
  panel(c,1320,780,155,155,'#637675');rect(c,'#263b3e',1335,795,125,125);
  const phase=Math.floor(t*4)%4;
  for(let i=0;i<4;i++){
    const a=(i+phase*.25)*Math.PI/2;
    rect(c,'#8c9c91',1393+Math.cos(a)*28-8,853+Math.sin(a)*28-8,16,16);
  }
  rect(c,'#c2bc9c',1387,847,18,18);
  for(const i of s.interactions)machine(c,i.x,i.y+32,i.type,v.selectedId===i.id,t);
}
function occlusion(c,s) {
  // Foreground posts and cable bundles do not participate in collision.
  for(let x=40;x<s.width;x+=380){
    rect(c,'#1d3033',x,2340,22,160);rect(c,'#536765',x+3,2340,5,160);
    rect(c,'#ac865a',x-4,2365,30,8);rivets(c,x-2,2367,26,12);
  }
  rect(c,'#263c3d',0,2460,s.width,12);rect(c,'#6d7d72',0,2460,s.width,3);
}
export function drawScene(ctx,scene,view) {
  const p=palettes[scene.theme]||palettes.workshop;
  ctx.save();
  background(ctx,scene,view,p);
  ctx.save();ctx.translate(-view.camera.x,-view.camera.y);
  structure(ctx,scene,p);
  for(const floor of scene.platforms)deck(ctx,floor);
  for(const l of scene.ladders)ladder(ctx,l);
  machinery(ctx,scene,view);
  operator(ctx,view.player);
  occlusion(ctx,scene);
  ctx.restore();ctx.restore();
}
