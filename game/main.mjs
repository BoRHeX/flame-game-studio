// I.C.E. mobile vertical slice: hub, manual devices, authored chambers and three contracts.
// Zero remote services. All visible in-game instruction is iconographic.
import {GameClocks} from './core/clocks.mjs';
import {BurnerSolver} from './simulation/burner.mjs';
import {JOBS,MissionEvaluator} from './missions/jobs.mjs';
import {CHAMBERS} from './chambers/flow.mjs';
import {FlameParticles} from './flame/particles.mjs';
import {ProcessSound} from './audio/sound.mjs';
const $=(id)=>document.getElementById(id);
const world=$('world'),flame=$('flame'),view=$('viewport'),wc=world.getContext('2d',{alpha:false}),fc=flame.getContext('2d');
const cashOutput=$('cash'),clockOutput=$('mission-clock'),tempOutput=$('temperature'),result=$('result');
const panel=$('device-panel'),slider=$('device-slider'),symbol=$('device-symbol');
const progress=$('progress'),progressFill=$('progress-fill');
const missionButtons=Array.from(document.querySelectorAll('[data-job]'));
const DEVICES=Object.freeze([
  {id:'pilotFuel',x:97,icon:'◇',label:'Pilot fuel valve'},
  {id:'pilotAir',x:205,icon:'△',label:'Pilot air damper'},
  {id:'mainFuel',x:310,icon:'◆',label:'Main fuel valve'},
  {id:'mainAir',x:423,icon:'≋',label:'Main air damper'},
  {id:'draft',x:536,icon:'↻',label:'Draft damper'}
]);
const clocks=new GameClocks(),particles=new FlameParticles(),sound=new ProcessSound();
const player={x:70,target:70,y:269,speed:165};
let stage='hub',job=null,burner=null,evaluator=null,watching=false,selected=null,pending=null;
let funds=110,frameLast=0,shownTutorial=true;
function playSound(){sound.unlock().catch(()=>{});}
function updateControls(){
  const mission=stage==='mission';
  $('spark').disabled=!mission;
  $('observe').disabled=!mission;
  $('return').disabled=stage==='hub';
  for(const button of missionButtons){
    button.disabled=stage!=='hub';button.classList.toggle('selected',job?.id===button.dataset.job);
  }
}
function showDevice(def){
  if(!burner||stage!=='mission')return;
  selected=def;panel.hidden=false;symbol.textContent=def.icon;
  slider.value=Math.round(burner.devices[def.id]*100);
  slider.setAttribute('aria-label',def.label);
}
function beginJob(id){
  const chosen=JOBS.find(x=>x.id===id);
  if(!chosen||stage!=='hub'||funds<=0)return;
  job=chosen;burner=new BurnerSolver(chosen.burner);evaluator=new MissionEvaluator(chosen);
  stage='mission';watching=false;selected=null;pending=null;panel.hidden=true;
  player.x=70;player.target=70;particles.clear();clocks.resetMission();
  view.classList.remove('observing');$('observe').setAttribute('aria-pressed','false');
  result.textContent=chosen.symbol;result.setAttribute('aria-label',chosen.label);
  updateControls();playSound();
}
function backToHub(){
  if(stage==='hub')return;
  stage='hub';watching=false;pending=null;selected=null;panel.hidden=true;
  player.target=70;player.x=70;job=null;burner=null;evaluator=null;particles.clear();
  view.classList.remove('observing');$('observe').setAttribute('aria-pressed','false');
  result.textContent='⌂';result.setAttribute('aria-label','Backyard hub');
  progressFill.style.width='0%';progress.setAttribute('aria-valuenow','0');
  sound.stop();updateControls();
}
function resetGame(){
  funds=110;backToHub();clocks.resetMission();result.textContent='⌂';
  $('tutorial').hidden=false;shownTutorial=true;
}
function toggleObservation(){
  if(stage!=='mission')return;
  watching=!watching;
  if(watching){selected=null;panel.hidden=true;}
  view.classList.toggle('observing',watching);
  $('observe').setAttribute('aria-pressed',String(watching));
  playSound();
}
function closestDevice(x){
  let best=null,distance=Infinity;
  for(const def of DEVICES){
    const delta=Math.abs(def.x-x);
    if(delta<distance){distance=delta;best=def;}
  }
  return distance<43?best:null;
}
world.addEventListener('pointerdown',(e)=>{
  if(stage!=='mission'&&stage!=='hub')return;
  const r=world.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*640;
  const y=(e.clientY-r.top)/r.height*360;
  if(stage==='mission'&&y<248){
    const dev=closestDevice(x);
    if(dev){
      player.target=dev.x;
      if(Math.abs(player.x-dev.x)<53)showDevice(dev);
      else pending=dev;
      return;
    }
  }
  pending=null;player.target=Math.max(35,Math.min(605,x));
});
flame.addEventListener('pointerdown',toggleObservation);
document.addEventListener('keydown',(e)=>{
  if(['ArrowRight','ArrowLeft'].includes(e.key)&&panel.hidden){
    player.target=Math.max(30,Math.min(610,player.x+(e.key==='ArrowRight'?60:-60)));
    e.preventDefault();
  }else if(e.key==='Escape'&&watching)toggleObservation();
  else if(e.key.toLowerCase()==='e'&&stage==='mission'){
    const d=closestDevice(player.x);if(d)showDevice(d);
  }
});
slider.addEventListener('input',()=>{
  if(selected&&burner&&stage==='mission')burner.setDevice(selected.id,Number(slider.value)/100);
});
$('device-close').addEventListener('click',()=>{selected=null;panel.hidden=true;playSound();});
$('spark').addEventListener('click',()=>{
  if(stage!=='mission')return;
  playSound();sound.click();burner.ignite();
});
$('observe').addEventListener('click',toggleObservation);
$('return').addEventListener('click',backToHub);
$('reset').addEventListener('click',resetGame);
$('tutorial-ok').addEventListener('click',()=>{shownTutorial=false;$('tutorial').hidden=true;playSound();});
for(const button of missionButtons)button.addEventListener('click',()=>beginJob(button.dataset.job));
function physicsStep(processDt,missionDt,cashDt){
  if(stage!=='failed'&&funds>0)funds=Math.max(0,funds-0.32*cashDt);
  if(stage!=='mission'||!burner)return;
  const state=burner.step(processDt);
  particles.step(processDt,state,CHAMBERS[job.chamber]);
  sound.update(state,watching);
  const outcome=evaluator.tick(processDt,missionDt,state,funds);
  if(outcome==='won'){
    stage='won';funds+=job.payout;result.textContent='✓';result.setAttribute('aria-label','Contract complete');
    watching=false;view.classList.remove('observing');$('observe').setAttribute('aria-pressed','false');
    sound.stop();updateControls();
  }else if(outcome==='failed'){
    stage='failed';result.textContent='✕';result.setAttribute('aria-label','Contract failed');
    watching=false;view.classList.remove('observing');$('observe').setAttribute('aria-pressed','false');
    sound.stop();updateControls();
  }
}
function drawWorld(){
  wc.fillStyle=stage==='hub'?'#182937':'#1e2731';wc.fillRect(0,0,640,360);
  for(let i=0;i<14;i++){
    wc.fillStyle=i%2?'#213443':'#233645';wc.fillRect(i*48,50,46,185);
    wc.fillStyle='#364d58';wc.fillRect(i*48,51,2,182);
  }
  wc.fillStyle='#405661';wc.fillRect(0,306,640,54);
  wc.fillStyle='#586e78';wc.fillRect(0,301,640,7);
  if(stage==='hub'){
    wc.fillStyle='#304451';wc.fillRect(35,157,152,142);
    wc.fillStyle='#83949b';wc.fillRect(49,190,104,78);
    wc.fillStyle='#cc6e43';wc.fillRect(59,209,18,34);
    wc.fillStyle='#e4ad68';wc.fillRect(202,214,37,87);
    wc.fillStyle='#526875';wc.fillRect(263,113,330,131);
    for(let i=0;i<3;i++){
      const x=302+i*91;
      wc.fillStyle='#1b2b36';wc.fillRect(x,140,71,82);
      wc.fillStyle='#d9c188';wc.font='34px sans-serif';wc.fillText(JOBS[i].symbol,x+18,190);
    }
  }else{
    wc.fillStyle='#748b97';wc.fillRect(10,125,625,19);
    wc.fillStyle='#516774';wc.fillRect(10,142,625,17);
    DEVICES.forEach((d,i)=>{
      wc.fillStyle=selected?.id===d.id?'#cfaf75':'#698391';
      wc.fillRect(d.x-25,174,50,61);
      wc.fillStyle='#162d39';wc.fillRect(d.x-20,179,40,51);
      wc.fillStyle='#efcc8c';wc.font='31px sans-serif';wc.fillText(d.icon,d.x-15,213);
      wc.fillStyle='#b6c3cc';wc.fillRect(d.x-4,144,8,29);
    });
    wc.fillStyle='#6b8793';wc.fillRect(530,61,94,67);
    wc.fillStyle='#162a35';wc.fillRect(543,72,67,44);
    wc.fillStyle='#eac47a';wc.font='32px sans-serif';wc.fillText('◎',559,106);
  }
  const dx=player.target-player.x;
  if(Math.abs(dx)>1.5)player.x+=Math.sign(dx)*Math.min(Math.abs(dx),player.speed/18);
  if(pending&&Math.abs(player.x-pending.x)<53){showDevice(pending);pending=null;}
  wc.fillStyle='#101f2a';wc.fillRect((player.x-11)|0,272,22,29);
  wc.fillStyle='#dbd4b3';wc.fillRect((player.x-9)|0,248,18,25);
  wc.fillStyle='#b88a5b';wc.fillRect((player.x-10)|0,245,20,7);
  wc.fillStyle='#7292a4';wc.fillRect((player.x-14)|0,275,28,6);
}
function drawChamber(){
  fc.clearRect(0,0,640,360);
  if(!burner||!job)return;
  const chamber=CHAMBERS[job.chamber],state=burner.snapshot();
  fc.fillStyle=chamber.color;fc.fillRect(0,0,640,360);
  fc.fillStyle='#2e3d48';fc.fillRect(18,23,606,313);
  fc.fillStyle='#121e29';fc.fillRect(24,30,592,297);
  fc.fillStyle='#4f626d';fc.fillRect(19,23,603,9);fc.fillRect(19,325,603,12);
  fc.fillStyle='rgba(249,108,34,'+Math.min(.26,Math.max(0,state.temperature-.15)*.13)+')';
  fc.fillRect(35,37,571,275);
  const x=chamber.nozzle.x,y=chamber.nozzle.y;
  fc.fillStyle='#8c969a';
  if(chamber.orientation==='updraft'){fc.fillRect(x-18,y+3,36,83);fc.fillStyle='#4a545e';fc.fillRect(x-10,y,20,35);}
  else{fc.fillRect(0,y-20,x,40);fc.fillStyle='#4a545e';fc.fillRect(x-31,y-13,35,26);}
  if(chamber.baffle){fc.fillStyle='#70767c';fc.fillRect(394,35,12,118*chamber.baffle);}
  if(chamber.orientation==='updraft'){fc.fillStyle='#6d777f';fc.fillRect(275,12,64,19);}
  particles.draw(fc,state,chamber);
  if(state.failed){fc.fillStyle='rgba(245,26,21,.29)';fc.fillRect(20,30,600,290);}
}
function updateHUD(){
  cashOutput.value=funds.toFixed(1);clockOutput.value=clocks.missionTime.toFixed(0);
  tempOutput.value=(burner?.temperature??0.12).toFixed(2);
  const pct=evaluator?Math.round(evaluator.progress()*100):0;
  progressFill.style.width=pct+'%';progress.setAttribute('aria-valuenow',String(pct));
}
function frame(now){
  if(!frameLast)frameLast=now;
  const dt=(now-frameLast)/1000;frameLast=now;
  const frames=clocks.advance(dt,watching,physicsStep);
  if(frames.world)drawWorld();
  if(frames.flame&&watching)drawChamber();
  updateHUD();requestAnimationFrame(frame);
}
updateControls();drawWorld();
window.ICE_DEBUG=Object.freeze({snapshot:()=>({
  stage,watching,funds,missionTime:clocks.missionTime,playerX:player.x,
  job:job?.id??null,solver:burner?.snapshot()??null,objective:evaluator?.progress()??0,
  particles:particles.activeCount()
})});
requestAnimationFrame(frame);
