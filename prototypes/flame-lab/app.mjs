import {BurnerSolver,clamp} from './simulation.mjs';
const world=document.querySelector('#world');
const flame=document.querySelector('#flame');
const ctx=world.getContext('2d',{alpha:false});
const fx=flame.getContext('2d',{alpha:true});
const fuel=document.querySelector('#fuel'),air=document.querySelector('#air'),spark=document.querySelector('#spark'),watch=document.querySelector('#watch'),reset=document.querySelector('#reset');
const money=document.querySelector('#money'),clock=document.querySelector('#clock'),indicator=document.querySelector('#indicator');
let solver=new BurnerSolver(),watching=false,cash=100,missionTime=0,last=0,simAccumulator=0,worldAccumulator=0,flameAccumulator=0,seed=1291;
const particles=Array.from({length:820},()=>({active:false,x:0,y:0,vx:0,vy:0,life:0,max:1,size:1}));
let cursor=0;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function fireParticle(state){
  if(!state.lit)return;
  const p=particles[cursor++%particles.length],t=rand();
  p.active=true;p.x=80;p.y=172+(rand()-.5)*8;p.vx=38+rand()*100;p.vy=(rand()-.5)*(17+state.soot*25);
  p.life=0;p.max=0.4+rand()*0.7;p.size=2+Math.floor(rand()*3);
}
function simulateParticles(dt,s){
  const emission=s.lit?Math.floor(18+s.heatRelease*50):0;
  for(let i=0;i<emission;i++)fireParticle(s);
  for(const p of particles){
    if(!p.active)continue;
    p.life+=dt;
    if(p.life>p.max||p.x>636||p.y<10||p.y>345){p.active=false;continue}
    // Authored virtual flow: acceleration, mixing, exhaust.
    const mixing=p.x>155&&p.x<330;
    const recirc=p.x>280&&p.x<420&&p.y>201;
    const flow=recirc?-8:p.x>330?32:mixing?16:0;
    p.x+=(p.vx+flow)*dt;
    p.y+=(p.vy+Math.sin(p.x*.052+p.max*13)* (mixing?18:6)+s.soot*8)*dt;
  }
}
function drawWorld(){
  ctx.fillStyle='#14202c';ctx.fillRect(0,0,640,360);
  ctx.fillStyle='#1c2c39';ctx.fillRect(18,35,604,270);
  ctx.fillStyle='#2a3d49';ctx.fillRect(22,39,596,7);ctx.fillRect(22,296,596,5);
  for(let i=0;i<12;i++){ctx.fillStyle='#263742';ctx.fillRect(33+i*49,54,2,230)}
  ctx.fillStyle='#82929d';ctx.fillRect(0,153,84,38);
  ctx.fillStyle='#41515e';ctx.fillRect(59,159,30,26);
  ctx.fillStyle='#1a2b34';ctx.fillRect(620,61,20,215);
  ctx.fillStyle='#608092';ctx.fillRect(615,60,7,217);
}
function drawFlame(s){
  fx.clearRect(0,0,640,360);
  if(s.temperature>0.22){
    fx.fillStyle='rgba(252,116,24,'+clamp((s.temperature-.22)*0.07,0,0.15)+')';
    fx.fillRect(92,52,510,238);
  }
  for(const p of particles){
    if(!p.active)continue;
    const age=p.life/p.max,hot=1-age;
    let color;
    if(age>0.79&&s.soot>0.16)color='rgba(94,105,113,0.44)';
    else if(s.ratio<0.75)color=hot?'#79c8ff':'#2f83d7';
    else if(s.ratio>1.2)color=hot?'#ffd177':'#e36a24';
    else color=hot?'#fff6b4':age>.5?'#f88a40':'#ffcc56';
    fx.fillStyle=color;fx.fillRect(p.x|0,p.y|0,p.size,p.size);
  }
}
function tick(dt){
  solver.control({fuelValve:+fuel.value/100,airDamper:+air.value/100});
  const speed=watching?2:1;
  const s=solver.step(dt*speed);
  missionTime+=dt*speed;
  cash=Math.max(0,cash-dt*(watching?0.35:1));
  simulateParticles(dt*speed,s);
}
function frame(t){
  if(!last)last=t;
  const dt=Math.min((t-last)/1000,0.06);last=t;
  simAccumulator+=dt;worldAccumulator+=dt;flameAccumulator+=dt;
  let steps=0;
  while(simAccumulator>=1/60&&steps<5){tick(1/60);simAccumulator-=1/60;steps++}
  if(steps===5)simAccumulator=0;
  if(worldAccumulator>=1/18){drawWorld();worldAccumulator%=1/18}
  if(flameAccumulator>=1/24){drawFlame(solver.snapshot());flameAccumulator%=1/24}
  money.value=cash.toFixed(1);clock.value=missionTime.toFixed(0);
  indicator.classList.toggle('active',solver.lit);
  indicator.setAttribute('aria-label',solver.lit?'Flame burning':'Flame off');
  requestAnimationFrame(frame);
}
function ignite(){solver.control({spark:true});solver.step(1/60);solver.control({spark:false});}
spark.addEventListener('click',ignite);
watch.addEventListener('click',()=>{watching=!watching;watch.setAttribute('aria-pressed',String(watching))});
reset.addEventListener('click',()=>{solver=new BurnerSolver();cash=100;missionTime=0;seed=1291;cursor=0;fuel.value=45;air.value=50;particles.forEach(p=>p.active=false)});
watch.setAttribute('aria-pressed','false');
drawWorld();requestAnimationFrame(frame);
