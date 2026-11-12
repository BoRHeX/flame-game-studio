// Original procedural pixel art; presentation only.
import {drawParallax} from './parallax.mjs';
export const VIEWPORT=Object.freeze({width:768,height:1152});
const levels=[2300,1840,1380,920];
function geometry(){return {platforms:levels.map((y,i)=>({id:'floor-'+i,x:i?80:0,y,w:i?1440:1600,h:20})),ladders:[{id:'ladder-0',x:410,y:1840,w:48,h:460},{id:'ladder-1',x:1040,y:1380,w:48,h:460},{id:'ladder-2',x:490,y:920,w:48,h:460}]};}
const station=(id,type,x,y,icon,label,deviceId)=>({id,type,x,y,icon,label,...(deviceId?{deviceId}:{})});
function scene(id,theme,interactions){return {id,width:1600,height:2700,spawn:{x:180,y:2248},...geometry(),interactions,theme};}
function jobStations(jobId){
 const placements={backyard:{x:750,y:1348},warehouse:{x:930,y:888},'heat-hold':{x:1130,y:1808}};
 const operator=placements[jobId];
 return [station('spark','ignition',150,2268,'spark','Ignition'),station('port','observation',245,2268,'port','Observation port'),station('exit','exit',70,2268,'exit','Return to workshop'),station('pilotFuel','device',650,2268,'valve','Pilot fuel','pilotFuel'),station('pilotAir','device',820,1808,'damper','Pilot air','pilotAir'),station('mainFuel','device',1200,1808,'valve','Main fuel','mainFuel'),station('mainAir','device',700,1348,'damper','Main air','mainAir'),station('draft','device',1000,888,'damper','Draft','draft'),station('site-operator','npc',operator.x,operator.y,'operator','Site operator'),...(jobId==='backyard'?[station('intake-shield','repair',960,1808,'shield','Intake shield')]:[])];
}
export const SCENES={hub:scene('hub','workshop',[station('contracts','contracts',235,2268,'board','Contract board'),station('practice','practice',670,2268,'port','Home burner'),station('workbench','workbench',980,1808,'tools','Equipment bench'),station('npc','npc',1200,1348,'operator','Workshop operator')]),backyard:scene('backyard','yard',jobStations('backyard')),warehouse:scene('warehouse','warehouse',jobStations('warehouse')),'heat-hold':scene('heat-hold','heater',jobStations('heat-hold'))};
const palettes={workshop:{wall:'#52656a',trim:'#82918a',accent:'#d29852',light:'#ffe1a0'},yard:{wall:'#728078',trim:'#a3a99a',accent:'#d78043',light:'#ffe5a3'},warehouse:{wall:'#58645f',trim:'#84908a',accent:'#bd7945',light:'#efcf8c'},heater:{wall:'#76625b',trim:'#a28d7b',accent:'#d07a48',light:'#ffd5a0'}};
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function rivets(c,x,y,w,spacing=32){for(let a=x+8;a<x+w-3;a+=spacing){rect(c,'#25343a',a,y,4,4);rect(c,'#b8b8a4',a,y,2,2);}}
function panel(c,x,y,w,h,base='#566b6c'){rect(c,'#1d2c31',x,y,w,h);rect(c,base,x+4,y+4,w-8,h-8);rect(c,'#a3aba0',x+6,y+6,w-12,3);rect(c,'#34474a',x+6,y+h-9,w-12,3);rivets(c,x+4,y+10,w-8);rivets(c,x+4,y+h-13,w-8);}
function pipe(c,x,y,w,h){rect(c,'#202f35',x-3,y-3,w+6,h+6);rect(c,'#617779',x,y,w,h);if(w>h){rect(c,'#b3b5a4',x,y+3,w,4);rect(c,'#354c50',x,y+h-6,w,4);}else{rect(c,'#b3b5a4',x+3,y,4,h);rect(c,'#354c50',x+w-6,y,4,h);}}
function flange(c,x,y,w,h){panel(c,x,y,w,h,'#71817a');rect(c,'#b88b62',x+5,y+5,w-10,2);}
function elbow(c,x,y){pipe(c,x,y,110,24);pipe(c,x+86,y,24,90);rect(c,'#526c6b',x+86,y+4,20,20);rect(c,'#bdad91',x+87,y+4,17,3);flange(c,x+38,y-5,18,34);flange(c,x+81,y+46,34,18);}
function wear(c,x,y,w,h){for(let i=0;i<10;i++){const a=x+12+(i*73)%(w-24),b=y+16+(i*47)%(h-32);rect(c,'#735444',a,b,13+i%3*5,3);rect(c,'#b9845d',a+3,b+3,5,6+i%3*3);rect(c,'#b6b8a5',a+19,b-4,9,2);}}
function wheel(c,x,y,r=18){rect(c,'#25353a',x-r-3,y-r-3,r*2+6,r*2+6);rect(c,'#b66d46',x-r,y-r,r*2,r*2);rect(c,'#e2a76a',x-r+4,y-r+4,r*2-8,r*2-8);rect(c,'#34474a',x-r+8,y-r+8,r*2-16,r*2-16);rect(c,'#d48651',x-3,y-r,6,r*2);rect(c,'#d48651',x-r,y-3,r*2,6);rect(c,'#e4b37a',x-4,y-4,8,8);}
function lamp(c,x,y,p){rect(c,'#25343a',x-3,y-27,6,24);rect(c,'#243339',x-18,y-5,36,10);rect(c,p.accent,x-13,y+5,26,5);rect(c,p.light,x-9,y+10,18,7);rect(c,'rgba(255,211,137,0.07)',x-35,y+17,70,65);}
function windowPane(c,x,y,w,h,lit,coastal=false){
 rect(c,'#23343b',x,y,w,h);
 if(coastal){
  rect(c,'#d88c80',x+5,y+5,w-10,h-10);rect(c,'#f5bf90',x+5,y+h*.30,w-10,h*.26);
  rect(c,'#ffdfa2',x+w*.68,y+h*.18,w*.14,h*.20);rect(c,'#ffeab4',x+w*.65,y+h*.22,w*.20,h*.12);
  for(let k=0;k<5;k++)rect(c,k%2?'#8e7c80':'#9d8582',x+5+k*(w-10)/5,y+h*.49-(k%3)*5,(w-10)/5+1,h*.14);
  rect(c,'#528a87',x+5,y+h*.58,w-10,h*.35);
  for(let k=0;k<4;k++)rect(c,k%2?'#ecc39a':'#87aaa0',x+w*.55-k*4,y+h*.62+k*8,w*.24+k*3,2);
  for(let k=0;k<6;k++)rect(c,k%2?'#285840':'#37694d',x+5+k*(w-10)/6,y+h*.86-(k%3)*4,(w-10)/6+1,h*.10);
 }else rect(c,lit?'#bfaa79':'#527079',x+5,y+5,w-10,h-10);
 rect(c,lit?'#ead09a':'#779097',x+9,y+9,w-18,5);rect(c,'#344a4e',x+w/2-3,y+4,6,h-8);rect(c,'#344a4e',x+4,y+h/2-3,w-8,6);
}
function vines(c,x,y,h,side){rect(c,'#294b3b',x,y,5,h);for(let j=0;j<h;j+=30){const d=(j/30)%2?side:-side;rect(c,'#426b4b',x+(d<0?-14:4),y+j+5,14,5);rect(c,'#365d43',x+(d<0?-22:13),y+j,14,10);rect(c,'#77915d',x+(d<0?-19:15),y+j+1,9,2);}}
function cables(c,x,y,w){for(let k=0;k<3;k++){rect(c,'#202e31',x,y+k*9,w,6);rect(c,k===1?'#b27a56':'#71817c',x,y+k*9,w,2);}for(let a=x+40;a<x+w;a+=100){rect(c,'#a8997d',a,y-3,5,30);rect(c,'#283c3c',a+5,y-3,3,30);}}
function fan(c,x,y,t){panel(c,x,y,155,155,'#637675');rect(c,'#263b3e',x+15,y+15,125,125);const phase=Math.floor(t*4)%4;for(let i=0;i<4;i++){const a=(i+phase*.25)*Math.PI/2;rect(c,'#8c9c91',x+73+Math.cos(a)*28-8,y+73+Math.sin(a)*28-8,16,16);}rect(c,'#c2bc9c',x+67,y+67,18,18);for(let j=0;j<7;j++){rect(c,'#26383b',x+17,y+23+j*16,121,5);rect(c,'#a5afa1',x+17,y+23+j*16,121,2);}}
function smoke(c,x,y,v){if(!v.process?.mainLit&&!v.process?.pilotLit)return;const t=v.reducedMotion?0:(Number.isFinite(v.time)?v.time%1000:0);rect(c,'rgba(113,118,108,0.28)',x-10,y-15,20,15);for(let i=0;i<7;i++){const rise=((i*30+Math.floor(t*12))%210+210)%210,drift=Math.floor(rise*.20);rect(c,'rgba(113,118,108,0.28)',x+drift-12-rise*.08,y-rise-18,25+rise*.15,15);rect(c,'rgba(204,189,163,0.20)',x+drift-7-rise*.08,y-rise-23,19+rise*.12,8);}}
function chamber(c,x,y,w,h,process){
 panel(c,x,y,w,h,'#596a66');rect(c,'#344b4b',x+14,y+17,w-28,h-34);rect(c,'#8a8070',x+22,y+25,w-44,h-50);
 for(let yy=y+30;yy<y+h-30;yy+=34){rect(c,'#665b52',x+24,yy,w-48,3);for(let xx=x+35+((yy-y)%68?0:30);xx<x+w-30;xx+=65)rect(c,'#665b52',xx,yy+3,3,30);}
 rect(c,'#293b3c',x+32,y+32,w-64,h-64);rect(c,'#77847b',x+38,y+38,w-76,h-76);wear(c,x+38,y+38,w-76,h-76);
 const px=x+w/2-35,py=y+h/2-30;panel(c,px-12,py-12,94,84,'#8e806c');rect(c,'#a66e50',px-4,py-4,78,68);rect(c,'#26383b',px,py,70,60);rect(c,'#182a30',px+6,py+6,58,48);
 if(process?.mainLit||process?.pilotLit){const main=!!process.mainLit,rich=main&&process.mainRatio>1.06;rect(c,rich?'#d67444':'#558c9c',px+9,py+9,52,42);rect(c,rich?'#f2aa65':'#84c2cb',px+15,py+15,40,30);rect(c,main?'#f5d5a3':'#b0d7d3',px+25,py+21,20,17);rect(c,'rgba(245,153,85,0.18)',px-10,py-10,90,80);}
 rect(c,'#c9c5aa',px+9,py+8,23,3);rivets(c,px-8,py-7,86,22);rivets(c,px-8,py+62,86,22);
}
function structure(c,s,p,v){
 rect(c,'#1b3036',0,2300,s.width,400);for(let x=20;x<s.width;x+=180){panel(c,x,2350,148,185,'#304c50');for(let k=0;k<4;k++)rect(c,'#172e35',x+13,2380+k*28,122,9);}pipe(c,0,2580,s.width,24);pipe(c,0,2650,s.width,17);
 if(s.id==='hub'){
  rect(c,'#26383d',105,630,1370,1650);rect(c,p.wall,130,660,1320,1620);rect(c,'#283a3d',90,620,1400,45);rect(c,'#e0aa76',115,628,1350,9);
  for(let x=160;x<1400;x+=155){rect(c,'#3c5050',x,670,8,1600);rect(c,'#71817a',x+8,670,3,1600);}for(let y=760;y<2200;y+=320)for(let x=210;x<1350;x+=300)windowPane(c,x,y,180,150,true,true);
  for(let x=145;x<1450;x+=110){rect(c,'#182b32',x,580,105,40);rect(c,'#c49b78',x+8,588,80,8);}pipe(c,1250,290,68,335);panel(c,1200,270,170,50,'#697b79');smoke(c,1284,270,v);
  for(let y=1520;y<2200;y+=310){panel(c,260,y,190,110,'#6a6254');rect(c,'#ba9870',270,y+75,170,7);for(let k=0;k<5;k++){rect(c,k%2?'#9e7557':'#899486',278+k*32,y+35,22,39);rect(c,'#d1bd91',281+k*32,y+38,16,4);}}
  chamber(c,520,1975,300,250,v.process);vines(c,1440,660,260,-1);
 }else if(s.id==='warehouse'){
  rect(c,'#303e42',55,580,1490,1710);rect(c,p.wall,80,620,1440,1650);for(let x=100;x<1500;x+=135){rect(c,'#36484a',x,620,12,1650);rect(c,'#82908a',x+12,620,3,1650);}for(let y=730;y<2180;y+=290){rect(c,'#293d40',90,y,1420,16);for(let x=180;x<1400;x+=310)windowPane(c,x,y+38,120,95,false);}
  panel(c,1110,1990,300,300,'#465954');for(let y=2020;y<2250;y+=26){rect(c,'#84918a',1120,y,280,4);rect(c,'#273e3e',1120,y+5,280,3);}chamber(c,475,1920,390,300,v.process);pipe(c,920,400,70,420);panel(c,900,385,110,35,'#697b79');smoke(c,955,385,v);cables(c,160,1030,1050);wear(c,1115,2000,290,270);
 }else if(s.id==='heat-hold'){
  pipe(c,780,210,92,700);panel(c,760,195,132,32,'#697b79');smoke(c,826,195,v);panel(c,570,500,510,1730,'#74635b');rect(c,'#3a4140',600,540,450,1660);rect(c,'#8c7665',615,550,420,1635);
  for(let y=620;y<2150;y+=190){rect(c,'#4e5551',600,y,450,22);rect(c,'#d0a080',610,y+3,430,4);rivets(c,610,y+8,430,36);}
  for(let y=760;y<1900;y+=420){panel(c,715,y,230,150,'#434d4b');rect(c,'#1a2a30',765,y+30,130,90);if(v.process?.mainLit){rect(c,v.process.mainRatio>1.06?'#d67444':'#558c9c',775,y+45,110,65);rect(c,'#e9c99b',810,y+65,40,24);}else if(v.process?.pilotLit)rect(c,'#78aeb7',815,y+75,30,14);rect(c,'#718583',775,y+40,110,8);}
  chamber(c,675,1930,300,270,v.process);pipe(c,450,1000,115,34);pipe(c,1080,1560,260,42);wear(c,620,1120,410,320);
 }else if(s.id==='backyard'){
  // An open steel frame reveals the coastal parallax. These are scenery only;
  // the accepted platforms, ladders and interaction positions stay unchanged.
  rect(c,'#344e48',110,2180,1380,70);
  for(let x=120;x<1500;x+=330){rect(c,'#263e3e',x,1050,18,1200);rect(c,'#9e9e84',x+3,1050,4,1200);rect(c,'#d2a37a',x+14,1050,3,1200);}
  panel(c,520,1860,730,360,'#788782');rect(c,'#354d4e',550,1895,670,290);rect(c,'#9ca99b',565,1910,640,260);
  for(let x=620;x<1200;x+=130){rect(c,'#536b69',x,1910,9,260);rivets(c,x-4,1930,30,12);}wear(c,570,1920,630,240);chamber(c,715,1940,280,215,v.process);pipe(c,1130,1180,70,680);pipe(c,1190,1180,170,34);pipe(c,1130,700,70,480);panel(c,1110,680,110,36,'#697b79');smoke(c,1165,680,v);panel(c,620,2220,80,60,'#536863');panel(c,1060,2220,80,60,'#536863');vines(c,120,1050,410,1);vines(c,1465,1120,440,-1);
 }
 pipe(c,130,1100,34,1000);pipe(c,130,1090,1200,30);pipe(c,1300,1100,34,930);pipe(c,170,1530,950,24);for(let y=1200;y<2200;y+=250){flange(c,116,y,62,30);flange(c,1284,y,62,30);}elbow(c,180,1240);elbow(c,1120,1940);cables(c,260,1430,920);for(let y=780;y<2300;y+=460)for(let x=300;x<1500;x+=450)lamp(c,x,y,p);
}
function deck(c,p){rect(c,'#233438',p.x,p.y,p.w,p.h+9);rect(c,'#d2a878',p.x,p.y,p.w,3);rect(c,'#879890',p.x,p.y+3,p.w,3);rect(c,'#4a6060',p.x,p.y+6,p.w,12);for(let x=p.x+10;x<p.x+p.w-8;x+=22){rect(c,'#263d3e',x,p.y+8,13,5);rect(c,'#a4afa0',x,p.y+14,3,2);}if(p.y<2300){rect(c,'#354c4b',p.x,p.y-83,p.w,7);rect(c,'#d4ae83',p.x,p.y-84,p.w,3);rect(c,'#4a605d',p.x,p.y-43,p.w,5);for(let x=p.x+12;x<p.x+p.w;x+=80){rect(c,'#415653',x,p.y-83,6,83);rect(c,'#a0a99a',x+1,p.y-78,2,4);rect(c,'#9d7458',x-3,p.y-8,12,5);}}else for(let x=0;x<p.w;x+=100){rect(c,'#647875',x,p.y+22,92,3);rect(c,'#263a3d',x+45,p.y+25,4,18);}}
function ladder(c,l){rect(c,'#24383a',l.x-3,l.y,l.w+6,l.h);rect(c,'#778b80',l.x,l.y,7,l.h);rect(c,'#526c65',l.x+l.w-7,l.y,7,l.h);for(let y=l.y+12;y<l.y+l.h;y+=24){rect(c,'#a2ab96',l.x+6,y,l.w-12,5);rect(c,'#344e49',l.x+6,y+5,l.w-12,3);}}
function machine(c,x,y,kind,selected,time,deviceId=null,value=0,process=null,repaired=false){
 const top=y-100;
 if(kind==='contracts'){panel(c,x-65,top-8,130,100,'#8b684d');for(let i=0;i<3;i++){rect(c,'#d6c59b',x-49+i*34,top+12,26,55);rect(c,'#647774',x-45+i*34,top+21,18,4);rect(c,'#bd764e',x-43+i*34,top+34,12,12);rect(c,'#e7d8ad',x-38+i*34,top+3,5,8);}}
 else if(kind==='workbench'){rect(c,'#273a3c',x-75,y-50,150,12);rect(c,'#a48d70',x-72,y-56,144,8);rect(c,'#4c605e',x-60,y-38,10,38);rect(c,'#4c605e',x+50,y-38,10,38);panel(c,x-55,y-125,110,65,'#425956');for(let i=0;i<5;i++){rect(c,'#c5c4aa',x-42+i*20,y-115,4,30);rect(c,'#b2764f',x-46+i*20,y-90,12,5);}rect(c,'#84918a',x-22,y-70,44,14);rect(c,'#d0aa72',x-10,y-77,20,7);}
 else if(kind==='repair'){panel(c,x-55,y-110,110,108,'#5e7e79');rect(c,'#243f45',x-42,y-96,84,72);for(let j=0;j<4;j++){rect(c,repaired?'#a7bcb0':'#c59457',x-35,y-85+j*16,70,8);rect(c,'#3c5758',x-35,y-77+j*16,70,3);}for(const side of [-1,1]){rect(c,repaired?'#a9d6aa':'#df9b59',x+side*44-5,y-66,10,24);rect(c,'#243a3f',x+side*44-2,y-61,4,14);}rect(c,repaired?'#82d9aa':'#edb362',x-6,y-121,12,6);}
 else if(kind==='npc')operator(c,{x:x-14,y:y-52,w:28,h:52,vx:0,grounded:true,climbing:false,facing:-1,walkPhase:time*.4},true);
 else if(kind==='exit'){panel(c,x-29,y-92,58,92,'#46615e');rect(c,'#192c30',x-19,y-80,38,65);rect(c,'#d7b77c',x+8,y-50,5,7);}
 else{pipe(c,x-9,y-140,18,90);panel(c,x-40,y-85,80,78,kind==='practice'?'#8a6b58':'#5f7772');if(kind==='device'){if(/Air|draft/.test(deviceId??'')){rect(c,'#203b42',x-25,y-69,50,46);for(let k=0;k<4;k++)rect(c,'#8ca89c',x-19,y-64+k*9+Math.round(value*3),38,4);rect(c,'#d7ac68',x+26,y-64+value*32,12,8);}else{wheel(c,x,y-46,17);rect(c,'#ffe0a1',x-3+Math.sin(value*4.7)*13,y-49-Math.cos(value*4.7)*13,6,6);}}
 else if(kind==='ignition'){rect(c,'#2b3838',x-20,y-67,40,40);rect(c,'#d59552',x-11,y-58,22,22);rect(c,'#f5d58e',x-5,y-52,10,10);}
 else{rect(c,'#1b3036',x-25,y-70,50,43);rect(c,'#829b95',x-19,y-64,38,31);rect(c,'#2a4449',x-15,y-60,30,23);if(process?.mainLit){rect(c,process.mainRatio>1.06?'#f7a052':'#74bac5',x-12,y-55,24,17);rect(c,'#fff2c0',x-4,y-51,8,10);}else if(process?.pilotLit)rect(c,'#78aeb7',x-7,y-51,14,9);rect(c,'#b5c3ad',x-12,y-57,13,3);}}
 if(selected){rect(c,'#f5d18a',x-30,y-145,60,4);rect(c,'#f5d18a',x-30,y-145,4,18);rect(c,'#f5d18a',x+26,y-145,4,18);}
}
function operator(c,p,npc=false){const pose=p.pose??null;const x=Math.round(p.x+(pose?.lean??0)),y=Math.round(p.y+(pose?.bob??0)),w=p.w||28,h=p.h||52;const moving=p.climbing||Math.abs(p.vx||0)>2;const step=pose?pose.leg:moving?Math.round(Math.sin(p.walkPhase||0)*4):0;const arm=pose?.arm??(p.climbing?step:0);c.save();c.translate(x,y);c.scale(w/28,h/52);if(p.facing<0){c.translate(28,0);c.scale(-1,1);}rect(c,'#17272c',3,43+step,10,9-step);rect(c,'#17272c',16,43-step,10,9+step);rect(c,'#334e55',5,31,8,16+step);rect(c,'#334e55',16,31,8,16-step);rect(c,'#d8bf75',5,37,8,3);rect(c,'#d8bf75',16,37,8,3);rect(c,'#1f343a',4,18,21,18);rect(c,npc?'#a16d4c':'#63828a',6,19,17,17);rect(c,'#d9c68d',6,27,17,3);rect(c,'#e7d6a4',7,27,15,1);rect(c,'#344e54',1,20,5,15+arm);rect(c,'#344e54',23,20,5,15-arm);rect(c,'#c1a882',1,33+arm,5,4);rect(c,'#c1a882',23,33-arm,5,4);rect(c,'#342f2b',7,8,15,12);rect(c,'#bb936e',9,10,12,9);rect(c,'#243b40',6,2,18,9);rect(c,npc?'#d39b59':'#d4c68c',7,1,16,7);rect(c,'#f2dfaa',10,2,9,2);rect(c,'#a18355',5,8,21,3);rect(c,'#335861',13,10,10,5);rect(c,'#a6c3bd',15,10,7,2);rect(c,'#e7d5a3',8,21,3,4);rect(c,'#263d42',17,21,5,4);c.restore();}
function machinery(c,s,v){const t=v.reducedMotion?0:Number.isFinite(v.time)?v.time%1000:0;fan(c,1320,780,t);for(const i of s.interactions)machine(c,i.x,i.y+32,i.type,v.selectedId===i.id,t,i.deviceId,v.process?.devices?.[i.deviceId]??0,v.process,!!v.contract?.repaired);}
function occlusion(c,s){for(let x=40;x<s.width;x+=380){rect(c,'#1d3033',x,2340,22,160);rect(c,'#536765',x+3,2340,5,160);rect(c,'#ac865a',x-4,2365,30,8);rivets(c,x-2,2367,26,12);}rect(c,'#263c3d',0,2460,s.width,12);rect(c,'#6d7d72',0,2460,s.width,3);}
export function drawScene(ctx,scene,view){
 const p=palettes[scene.theme]||palettes.workshop;ctx.save();drawParallax(ctx,scene.id,view.camera,Number.isFinite(view.time)?view.time:0,{reducedMotion:!!view.reducedMotion});ctx.save();ctx.translate(-view.camera.x,-view.camera.y);structure(ctx,scene,p,view);for(const floor of scene.platforms)deck(ctx,floor);for(const l of scene.ladders)ladder(ctx,l);machinery(ctx,scene,view);operator(ctx,view.player);occlusion(ctx,scene);ctx.restore();
 const cam=view.camera,protect=[{x:view.player.x-cam.x-10,y:view.player.y-cam.y-10,w:52,h:76},...scene.interactions.map(i=>({x:i.x-cam.x-42,y:i.y-cam.y-128,w:84,h:160})),{x:0,y:0,w:cam.width,h:150},{x:0,y:cam.height-300,w:cam.width,h:300}];
 drawParallax(ctx,scene.id,cam,Number.isFinite(view.time)?view.time:0,{foreground:true,reducedMotion:!!view.reducedMotion,protectedAreas:protect});
 if(view.target){const tx=view.target.x-cam.x,ty=view.target.y-cam.y-160,x=Math.max(55,Math.min(cam.width-55,tx)),y=Math.max(145,Math.min(cam.height-320,ty));rect(ctx,'#112a30',x-21,y-21,42,42);rect(ctx,'#e9bc72',x-21,y-21,42,3);rect(ctx,'#e9bc72',x-21,y+18,42,3);ctx.fillStyle='#f4d89e';ctx.font='23px sans-serif';ctx.textAlign='center';ctx.fillText(ty<130?'↑':ty>cam.height-300?'↓':tx<55?'←':tx>cam.width-55?'→':'◇',x,y+8);}
 ctx.restore();
}
