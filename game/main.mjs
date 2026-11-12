// Major development preview: traversal and physical interactions around the existing process.
import {GameClocks} from './core/clocks.mjs';
import {BurnerSolver} from './simulation/burner.mjs';
import {JOBS,MissionEvaluator} from './missions/jobs.mjs';
import {CHAMBERS} from './chambers/flow.mjs';
import {FlameParticles} from './flame/particles.mjs';
import {ProcessSound} from './audio/sound.mjs';
import {SCENES,VIEWPORT,drawScene} from './world/industrial-yard.mjs';
import {PlatformPlayer} from './player/platformer.mjs';
import {thumbVector} from './input/thumb-joystick.mjs';
import {OperatorAI} from './npc/operator.mjs';
import {SaveStore,deviceTime} from './persistence/save-slots.mjs';
const $=id=>document.getElementById(id);
const world=$('world'),flame=$('flame'),viewport=$('viewport');
const wc=world.getContext('2d',{alpha:false}),fc=flame.getContext('2d');
const clocks=new GameClocks(),particles=new FlameParticles(),sound=new ProcessSound();
let scene=SCENES.hub;
const player=new PlatformPlayer(scene),held=new Set(),keys=new Set(),pointers=new Map();
const buttons=[...document.querySelectorAll('[data-job]')];
const icons={pilotFuel:'◇',pilotAir:'△',mainFuel:'◆',mainAir:'≋',draft:'↻'};
let stage='hub',job=null,burner=null,evaluator=null,watching=false,selected=null,practice=false;
let funds=110,frameLast=0,worldTime=0;
const operatorAI=new OperatorAI(),saveStore=new SaveStore(),completedJobs=new Set();
let activeOperator=null,operatorConsults=0,repairDone=false,feedbackUntil=0,saveAtSimTime=0,gameRestored=false;
const advice={
 backyard:{deviceId:'mainAir',value:0.52,cue:'≋ ◇'},
 warehouse:{deviceId:'draft',value:0.60,cue:'↻ ⚒'},
 'heat-hold':{deviceId:'mainFuel',value:0.35,cue:'◆ ◉'}
};
function cue(symbol,meaning){
 $('hint').textContent=symbol;$('hint').hidden=false;$('hint').setAttribute('aria-label',meaning);
 feedbackUntil=worldTime+4;
}
function closeOperator(){activeOperator=null;$('operator-panel').hidden=true;}
function captureState(){
 const s=player.state;
 return {schemaVersion:1,...deviceTime(),
  player:{x:s.x,y:s.y},
  economy:{funds},
  progression:{completed:[...completedJobs],operatorConsults,repairDone},
  scene:{id:scene.id,stage,practice},
  controls:{...preferences},
  mission:job&&burner?{jobId:job.id,stage,process:burner.snapshot(),
   evaluator:evaluator?{elapsed:evaluator.elapsed,hold:evaluator.hold,status:evaluator.status}:null,
   missionTime:clocks.missionTime}:null,
  operator:operatorAI.snapshot(),
  workshop:{visited:operatorConsults>0}
 };
}
function autosave(){
 try {return saveStore.saveAutosave(captureState()).ok===true;}catch{return false;}
}
function refreshSlots(){
 const rows=saveStore.listSlots();
 for(const x of rows){
  const row=$('slot-'+x.id);
  if(row)row.querySelector('output').textContent=x.occupied?'✓':'◇';
  const load=row?.querySelector('[data-load-slot]');
  if(load)load.disabled=!x.occupied;
 }
}
function openSaves(){closeOperator();$('save-panel').hidden=false;refreshSlots();clearInput();}
function closeSaves(){$('save-panel').hidden=true;clearInput();}
function restoreState(snapshot){
 if(!snapshot||!SCENES[snapshot.scene?.id]||!Number.isFinite(snapshot.economy?.funds))return false;
 if(snapshot.economy.funds<0||snapshot.economy.funds>100000)return false;
 const savedControls=snapshot.controls||{};
 if(['joystick','buttons'].includes(savedControls.mode))preferences.mode=savedControls.mode;
 if(['left','right'].includes(savedControls.hand))preferences.hand=savedControls.hand;
 applyControls();
 funds=snapshot.economy.funds;
 completedJobs.clear();
 for(const name of snapshot.progression?.completed||[]){
  if(JOBS.some(j=>j.id===name))completedJobs.add(name);
 }
 operatorConsults=Number.isSafeInteger(snapshot.progression?.operatorConsults)?
   Math.max(0,Math.min(100000,snapshot.progression.operatorConsults)):0;
 repairDone=snapshot.progression?.repairDone===true;
 operatorAI.restore(snapshot.operator);
 closeOperator();closeSaves();stopWatching();closeDevice();
 stage='hub';practice=false;job=null;burner=null;evaluator=null;
 let chosen=JOBS.find(j=>j.id===snapshot.mission?.jobId);
 const savedStage=snapshot.scene.stage;
 if(chosen&&['mission','won','failed'].includes(savedStage)){
  job=chosen;burner=new BurnerSolver(chosen.burner);evaluator=new MissionEvaluator(chosen);
  const data=snapshot.mission.process||{};
  for(const [name,value] of Object.entries(data.devices||{})){
   if(Object.hasOwn(burner.devices,name)&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1)
    burner.setDevice(name,value);
  }
  const scalars=['time','unburntFuel','temperature','heatRelease','stability','soot','pilotStability','mainRatio','fuelFlow','airFlow','peakTemperature','overheatSeconds'];
  for(const key of scalars)if(Number.isFinite(data[key])&&data[key]>=0&&data[key]<=100000)burner[key]=data[key];
  for(const key of ['pilotLit','mainLit','failed'])if(typeof data[key]==='boolean')burner[key]=data[key];
  const record=snapshot.mission.evaluator||{};
  if(Number.isFinite(record.hold)&&record.hold>=0&&record.hold<=10000)evaluator.hold=record.hold;
  if(Number.isFinite(record.elapsed)&&record.elapsed>=0&&record.elapsed<=100000)evaluator.elapsed=record.elapsed;
  if(['active','won','failed'].includes(record.status))evaluator.status=record.status;
  clocks.missionTime=Number.isFinite(snapshot.mission.missionTime)?Math.max(0,Math.min(100000,snapshot.mission.missionTime)):0;
  stage=savedStage;
 }else{
  clocks.resetMission();
  if(snapshot.scene.id==='hub'&&snapshot.scene.practice===true){
   practice=true;job=JOBS[0];burner=new BurnerSolver(job.burner);
  }
 }
 setScene(stage==='hub'?SCENES.hub:SCENES[job.id]);
 if(Number.isFinite(snapshot.player?.x)&&Number.isFinite(snapshot.player?.y)){
  player.state.x=Math.max(0,Math.min(scene.width-player.state.w,snapshot.player.x));
  player.state.y=Math.max(0,Math.min(scene.height-player.state.h,snapshot.player.y));
  player.state.vx=0;player.state.vy=0;player.state.climbing=false;
 }
 $('result').textContent=stage==='hub'?'⌂':stage==='won'?'✓':stage==='failed'?'✕':job.symbol;
 $('result').setAttribute('aria-label',stage==='hub'?'Backyard hub':stage==='won'?'Contract complete':stage==='failed'?'Contract failed':job.label);
 $('tutorial').hidden=true;particles.clear();sound.stop();
 updateControls();resize();renderWorld();return true;
}

const game=$('game'),controls=$('controls'),joy=$('joystick'),knob=$('joystick-knob'),pad=$('digital-pad');
const stick={x:0,y:0,id:null};
const prefKey='ice-pass-two-controls-v1';
let preferences={mode:'joystick',hand:'left'};
try{
  const saved=JSON.parse(localStorage.getItem(prefKey)||'{}');
  if(saved.mode==='buttons'||saved.mode==='joystick')preferences.mode=saved.mode;
  if(saved.hand==='right'||saved.hand==='left')preferences.hand=saved.hand;
}catch{ /* Private browsing must not stop the game. */ }
function resetStick(){stick.x=0;stick.y=0;stick.id=null;knob.style.transform='translate(0px,0px)';}
function saveControls(){try{localStorage.setItem(prefKey,JSON.stringify(preferences));}catch{}}
function applyControls(){
  controls.dataset.mode=preferences.mode;controls.dataset.hand=preferences.hand;
  joy.hidden=preferences.mode!=='joystick';pad.hidden=preferences.mode!=='buttons';
  $('controls-mode').setAttribute('aria-pressed',String(preferences.mode==='buttons'));
  $('controls-mode').setAttribute('aria-label',preferences.mode==='buttons'?'Use analog joystick':'Use directional buttons');
  $('handedness').setAttribute('aria-label',preferences.hand==='left'?'Move controls to right thumb':'Move controls to left thumb');
  resetStick();
}
applyControls();
joy.addEventListener('pointerdown',e=>{
  if(stick.id!==null)return;
  e.preventDefault();stick.id=e.pointerId;joy.setPointerCapture(e.pointerId);updateStick(e);
});
function updateStick(e){
  if(e.pointerId!==stick.id)return;
  const r=joy.getBoundingClientRect(),radius=Math.max(1,(Math.min(r.width,r.height)-knob.offsetWidth)/2-4);
  const x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
  const v=thumbVector(x,y,radius);
  stick.x=v.x;stick.y=v.y;
  knob.style.transform='translate('+Math.round(stick.x*radius)+'px,'+Math.round(stick.y*radius)+'px)';
}
joy.addEventListener('pointermove',e=>{if(e.pointerId===stick.id){e.preventDefault();updateStick(e);}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])
  joy.addEventListener(type,e=>{if(e.pointerId===stick.id)resetStick();});
$('controls-mode').addEventListener('click',()=>{
  preferences.mode=preferences.mode==='joystick'?'buttons':'joystick';
  clearInput();applyControls();saveControls();
});
$('handedness').addEventListener('click',()=>{
  preferences.hand=preferences.hand==='left'?'right':'left';
  clearInput();applyControls();saveControls();
});
function syncFullscreen(){
  const active=document.fullscreenElement===game;
  $('fullscreen').setAttribute('aria-pressed',String(active));
  $('fullscreen').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
  $('fullscreen').textContent=active?'⤡':'⛶';
  resize();
}
$('fullscreen').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(game.requestFullscreen)await game.requestFullscreen({navigationUI:'hide'});
    else throw new Error('unavailable');
    $('control-status').textContent='';
  }catch{$('control-status').textContent='Fullscreen is unavailable in this browser';}
  syncFullscreen();
});
document.addEventListener('fullscreenchange',syncFullscreen);
const playSound=()=>sound.unlock().catch(()=>{});
function camera(){return player.camera(scene,{width:world.width,height:world.height});}
function resize(){
  const r=viewport.getBoundingClientRect();
  if(r.width&&r.height){const h=Math.max(1,Math.round(VIEWPORT.width*r.height/r.width));if(world.width!==VIEWPORT.width)world.width=VIEWPORT.width;if(world.height!==h)world.height=h;}
}
function distance(i){const s=player.state;return Math.hypot(i.x-s.x-s.w/2,i.y-s.y-s.h/2);}
function near(id,r=112){const i=scene.interactions.find(x=>x.id===id);return !!i&&distance(i)<=r;}
function clearInput(){held.clear();keys.clear();pointers.clear();resetStick();}
function setScene(next){scene=next;player.setScene(scene);clearInput();closeOperator();}
function updateControls(){
  const board=stage==='hub'&&near('contracts');
  for(const b of buttons){b.disabled=!board;b.classList.toggle('selected',job?.id===b.dataset.job);}
  $('spark').disabled=!(stage==='mission'&&near('spark'))&&!(stage==='hub'&&practice&&near('practice'));
  $('observe').disabled=!watching&&!(stage==='mission'&&near('port'))&&!(stage==='hub'&&practice&&near('practice'));
  $('return').disabled=stage==='hub'&&!watching;
}
function closeDevice(){selected=null;$('device-panel').hidden=true;}
function stopWatching(){watching=false;$('inspection').hidden=true;viewport.classList.remove('observing');$('observe').setAttribute('aria-pressed','false');}
function beginJob(id){
  const chosen=JOBS.find(x=>x.id===id);
  if(!chosen||stage!=='hub'||!near('contracts')||funds<=0)return;
  stopWatching();closeDevice();practice=false;job=chosen;burner=new BurnerSolver(chosen.burner);evaluator=new MissionEvaluator(chosen);
  stage='mission';setScene(SCENES[chosen.id]);particles.clear();clocks.resetMission();
  repairDone=false;
  $('result').textContent=chosen.symbol;$('result').setAttribute('aria-label',chosen.label);$('hint').hidden=true;updateControls();playSound();autosave();
}
function backToHub(){
  if(stage==='hub'){if(watching)stopWatching();updateControls();return;}
  stopWatching();closeDevice();stage='hub';job=null;burner=null;evaluator=null;practice=false;particles.clear();setScene(SCENES.hub);
  $('result').textContent='⌂';$('result').setAttribute('aria-label','Backyard hub');$('progress-fill').style.width='0%';$('progress').setAttribute('aria-valuenow','0');sound.stop();updateControls();autosave();
}
function resetGame(){funds=110;completedJobs.clear();operatorConsults=0;repairDone=false;operatorAI.reset();if(stage!=='hub')backToHub();else{stopWatching();closeDevice();practice=false;burner=null;job=null;particles.clear();setScene(SCENES.hub);sound.stop();}clocks.resetMission();$('tutorial').hidden=false;updateControls();autosave();}
function toggleObservation(){
  if(!watching&&!(stage==='mission'&&near('port'))&&!(stage==='hub'&&practice&&near('practice')))return;
  watching=!watching;if(watching){closeDevice();clearInput();drawChamber();}
  $('inspection').hidden=!watching;viewport.classList.toggle('observing',watching);$('observe').setAttribute('aria-pressed',String(watching));playSound();updateControls();
}
function spark(){
  if(!((stage==='mission'&&near('spark'))||(stage==='hub'&&practice&&near('practice')))||!burner)return;
  playSound();sound.click();burner.ignite();
}
function showDevice(i){
  if(stage!=='mission'||!burner||distance(i)>112)return;
  selected=i;$('device-panel').hidden=false;$('device-symbol').textContent=icons[i.deviceId]||'◆';
  const jammed=job?.id==='warehouse'&&i.deviceId==='draft'&&!repairDone;
  $('device-slider').max=jammed?58:100;$('device-repair').hidden=!jammed;
  $('device-slider').value=Math.min(Number($('device-slider').max),Math.round(burner.devices[i.deviceId]*100));
  $('device-slider').setAttribute('aria-label',i.label);
  if(jammed)cue('⚒ ↻','Draft damper stuck at 58%; repair nearby to restore travel');
}
function interact(){
  if(watching){toggleObservation();return;}
  if(!$('device-panel').hidden){closeDevice();return;}
  const i=player.nearby(scene);if(!i)return;
  $('hint').hidden=true;
  if(i.type==='device')showDevice(i);
  else if(i.type==='ignition')spark();
  else if(i.type==='observation')toggleObservation();
  else if(i.type==='exit')backToHub();
  else if(i.type==='contracts')updateControls();
  else if(i.type==='practice'){
    if(!practice){practice=true;job=JOBS[0];burner=new BurnerSolver(job.burner);particles.clear();playSound();}
    else toggleObservation();
  }else if(i.type==='npc'){
    activeOperator=i;$('operator-panel').hidden=false;$('operator-assist').disabled=!(stage==='mission'&&burner);
    cue('☻ ◇','Operator: ask for diagnosis or request local assistance');
    autosave();
  }else if(i.type==='workbench'){
    cue('⚒ ▣','Workshop: use the save button to manage three slots');
    openSaves();
  }
}
for(const b of buttons)b.addEventListener('click',()=>beginJob(b.dataset.job));
$('spark').addEventListener('click',spark);$('observe').addEventListener('click',toggleObservation);$('return').addEventListener('click',backToHub);$('reset').addEventListener('click',resetGame);
$('tutorial-ok').addEventListener('click',()=>{$('tutorial').hidden=true;playSound();});
$('device-close').addEventListener('click',()=>{closeDevice();playSound();});
$('device-repair').addEventListener('click',()=>{
 if(job?.id!=='warehouse'||selected?.deviceId!=='draft'||repairDone||distance(selected)>112||funds<5)return;
 repairDone=true;funds=Math.max(0,funds-5);$('device-slider').max=100;$('device-repair').hidden=true;
 cue('⚒ ✓','Damper repaired for five credits; full draft travel restored');sound.click();autosave();
});
$('operator-close').addEventListener('click',closeOperator);
$('operator-guide').addEventListener('click',()=>{
 if(!activeOperator||distance(activeOperator)>112){closeOperator();return;}
 operatorConsults++;
 const state=burner?.snapshot();
 const hint=job?.id==='warehouse'?'↻ ⚒ 0.60':
  job?.id==='heat-hold'?'◆ 0.35 ◎':
  job?.id==='backyard'?'≋ 0.52 ✦':
  state?.mainLit?'✓ ◎':'◇ △ ϟ';
 cue(hint,'Operator diagnosis from current job and equipment');closeOperator();autosave();
});
$('operator-assist').addEventListener('click',()=>{
 if(!activeOperator||!burner||!job||distance(activeOperator)>112){closeOperator();return;}
 const target=advice[job.id],device=scene.interactions.find(x=>x.deviceId===target?.deviceId);
 // Assistance is physically local: never remotely actuate a valve on another floor.
 if(!target||!device||Math.hypot(device.x-activeOperator.x,device.y-activeOperator.y)>112){
  cue('✕ ⚒','Operator must be near equipment');closeOperator();return;
 }
 const result=operatorAI.request({id:'assist-'+job.id,type:'setDevice',deviceId:target.deviceId,value:target.value,jobId:job.id},{
  distancePx:distance(activeOperator),available:true,actorRole:'operator',authority:['operate'],
  jobId:job.id,missionStatus:'active',elapsed:clocks.missionTime
 });
 if(result.status==='accepted'){
  burner.setDevice(target.deviceId,target.value);operatorConsults++;sound.click();cue(target.cue+' ✓','Operator adjusted adjacent '+target.deviceId+' valve');
  autosave();
 }else cue('✕ '+result.cue,'Operator refused: '+result.reason);
 closeOperator();
});
$('save-menu').addEventListener('click',()=>$('save-panel').hidden?openSaves():closeSaves());
$('save-close').addEventListener('click',closeSaves);
for(const b of document.querySelectorAll('[data-save-slot]'))b.addEventListener('click',()=>{
 const id=Number(b.dataset.saveSlot),result=saveStore.saveSlot(id,captureState());
 cue(result.ok?'▣ '+id+' ✓':'▣ ✕',result.ok?'Saved slot '+id:'Save failed');
 refreshSlots();
});
for(const b of document.querySelectorAll('[data-load-slot]'))b.addEventListener('click',()=>{
 const id=Number(b.dataset.loadSlot);
 if(!saveStore.listSlots().some(s=>s.id===id&&s.occupied))return;
 if(restoreState(saveStore.loadSlot(id))) {autosave();cue('↶ '+id+' ✓','Loaded save slot '+id);}
 else cue('▣ ✕','Save slot is unavailable or invalid');
});
$('device-slider').addEventListener('input',()=>{if(selected&&burner&&stage==='mission'&&distance(selected)<=112)burner.setDevice(selected.deviceId,Number($('device-slider').value)/100);});
$('interact').addEventListener('click',interact);flame.addEventListener('pointerdown',toggleObservation);
for(const b of document.querySelectorAll('[data-hold]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();pointers.set(e.pointerId,b.dataset.hold);held.add(b.dataset.hold);b.setPointerCapture(e.pointerId);});
  const release=e=>{const action=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(action&&![...pointers.values()].includes(action))held.delete(action);};
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
}
const keyActions={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'jump',j:'jump'};
document.addEventListener('keydown',e=>{
  if(e.target.matches('input'))return;
  const k=e.key.length===1?e.key.toLowerCase():e.key,a=keyActions[k];
  if(a){keys.add(a);e.preventDefault();}else if(k==='e'&&!e.repeat){interact();e.preventDefault();}else if(k==='Escape'){if(watching)toggleObservation();else closeDevice();}
});
document.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(keyActions[k]){keys.delete(keyActions[k]);e.preventDefault();}});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){autosave();clearInput();frameLast=0;}});window.addEventListener('pagehide',autosave);window.addEventListener('resize',resize);
function movement(){
  const on=x=>held.has(x)||keys.has(x);
  const analog=preferences.mode==='joystick'?stick:{x:0,y:0};
  return {
    x:Math.max(-1,Math.min(1,Number(on('right'))-Number(on('left'))+analog.x)),
    y:Math.max(-1,Math.min(1,Number(on('down'))-Number(on('up'))+analog.y)),
    jump:on('jump')
  };
}
function physicsStep(processDt,missionDt,cashDt){
  player.update(1/60,watching||!$('tutorial').hidden||!$('device-panel').hidden||!$('operator-panel').hidden||!$('save-panel').hidden?{x:0,y:0,jump:false}:movement(),scene);
  if(selected&&distance(selected)>112)closeDevice();
  if(stage!=='failed'&&funds>0)funds=Math.max(0,funds-.32*cashDt);
  if(!burner||!(stage==='mission'||(stage==='hub'&&practice)))return;
  const state=burner.step(processDt);particles.step(processDt,state,CHAMBERS[job.chamber]);sound.update(state,watching);
  if(stage!=='mission')return;
  const outcome=evaluator.tick(processDt,missionDt,state,funds);
  if(outcome==='won'||outcome==='failed'){
    stage=outcome;if(outcome==='won'){funds+=job.payout;completedJobs.add(job.id);}
    $('result').textContent=outcome==='won'?'✓':'✕';$('result').setAttribute('aria-label',outcome==='won'?'Contract complete':'Contract failed');
    cue(outcome==='won'?'✓ ◈ '+job.payout:'✕ ◈','Job '+(outcome==='won'?'completed':'failed')+' with payout '+(outcome==='won'?job.payout:0));
    stopWatching();closeDevice();closeOperator();sound.stop();updateControls();autosave();
  }
}
function drawChamber(){
  fc.clearRect(0,0,640,360);if(!burner||!job)return;
  const chamber=CHAMBERS[job.chamber],state=burner.snapshot();
  fc.fillStyle=chamber.color;fc.fillRect(0,0,640,360);fc.fillStyle='#2e3d48';fc.fillRect(18,23,606,313);fc.fillStyle='#121e29';fc.fillRect(24,30,592,297);
  fc.fillStyle='#4f626d';fc.fillRect(19,23,603,9);fc.fillRect(19,325,603,12);
  fc.fillStyle='rgba(249,108,34,'+Math.min(.26,Math.max(0,state.temperature-.15)*.13)+')';fc.fillRect(35,37,571,275);
  const x=chamber.nozzle.x,y=chamber.nozzle.y;fc.fillStyle='#8c969a';
  if(chamber.orientation==='updraft'){fc.fillRect(x-18,y+3,36,83);fc.fillStyle='#4a545e';fc.fillRect(x-10,y,20,35);}else{fc.fillRect(0,y-20,x,40);fc.fillStyle='#4a545e';fc.fillRect(x-31,y-13,35,26);}
  if(chamber.baffle){fc.fillStyle='#70767c';fc.fillRect(394,35,12,118*chamber.baffle);}if(chamber.orientation==='updraft'){fc.fillStyle='#6d777f';fc.fillRect(275,12,64,19);}
  particles.draw(fc,state,chamber);if(state.failed){fc.fillStyle='rgba(245,26,21,.29)';fc.fillRect(20,30,600,290);}
}
function renderWorld(){drawScene(wc,scene,{camera:camera(),player:player.state,time:worldTime,selectedId:selected?.id??player.nearby(scene)?.id??null,stage,jobId:job?.id??null});}
function updateHUD(){
  $('cash').value=funds.toFixed(1);$('mission-clock').value=clocks.missionTime.toFixed(0);$('temperature').value=(burner?.temperature??.12).toFixed(2);
  const pct=evaluator?Math.round(evaluator.progress()*100):0;$('progress-fill').style.width=pct+'%';$('progress').setAttribute('aria-valuenow',String(pct));updateControls();
}
function frame(now){
  if(!frameLast)frameLast=now;const dt=(now-frameLast)/1000;frameLast=now;worldTime+=Math.min(dt,.1);
  const frames=clocks.advance(dt,watching,physicsStep);
  if(frames.world)renderWorld();if(frames.flame&&watching)drawChamber();
  if(worldTime>feedbackUntil&&!$('hint').hidden)$('hint').hidden=true;
  if(clocks.simTime-saveAtSimTime>=18){saveAtSimTime=clocks.simTime;autosave();}
  updateHUD();requestAnimationFrame(frame);
}
resize();updateControls();renderWorld();
try{gameRestored=restoreState(saveStore.loadAutosave());}catch{gameRestored=false;}
if(!gameRestored){refreshSlots();}
window.ICE_DEBUG=Object.freeze({snapshot:()=>{const c=camera(),s=player.state;return {stage,watching,funds,missionTime:clocks.missionTime,playerX:s.x,job:job?.id??null,solver:burner?.snapshot()??null,objective:evaluator?.progress()??0,particles:particles.activeCount(),playerY:s.y,cameraX:c.x,cameraY:c.y,sceneId:scene.id,worldWidth:scene.width,worldHeight:scene.height,grounded:s.grounded,climbing:s.climbing,controls:preferences.mode,hand:preferences.hand,stickX:stick.x,stickY:stick.y,fullscreen:document.fullscreenElement===game,completed:[...completedJobs],savedSlots:saveStore.listSlots().map(x=>({id:x.id,occupied:x.occupied})),operatorConsults,repairDone,autosaveRestored:gameRestored};}});
requestAnimationFrame(frame);
