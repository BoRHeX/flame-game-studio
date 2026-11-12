// Major development preview: traversal and physical interactions around the existing process.
import {GameClocks} from './core/clocks.mjs';
import {BurnerSolver} from './simulation/burner.mjs';
import {JOBS,MissionEvaluator} from './missions/jobs.mjs';
import {getJobTemplate,missionWarnings} from './missions/job-templates.mjs';
import {CHAMBERS} from './chambers/flow.mjs';
import {FlameParticles} from './flame/particles.mjs';
import {ProcessSound} from './audio/sound.mjs';
import {SCENES,VIEWPORT,drawScene} from './world/industrial-yard.mjs';
import {PlatformPlayer} from './player/platformer.mjs';
import {thumbVector} from './input/thumb-joystick.mjs';
import {OperatorAI} from './npc/operator.mjs';
import {SaveStore,deviceTime} from './persistence/save-slots.mjs';
import {validGameState} from './persistence/game-state.mjs';
import {DeviceControl} from './interaction/valve-wheel.mjs';
import {ContractSession,CONTRACTS} from './missions/contract-session.mjs';
import {samplePose,animationEvents} from './animation/operator.mjs';
import {environmentAt} from './world/parallax.mjs';
import {StoryState} from './narrative/story-flags.mjs';
import {Orchestra} from './audio/orchestra.mjs';
import {SCORE} from './audio/score-data.mjs';
import {cueForEvent} from './audio/event-sync.mjs';
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
const operatorAI=new OperatorAI(),saveStore=new SaveStore(undefined,validGameState),completedJobs=new Set();
const orchestra=new Orchestra(SCORE,cueForEvent);
let story=new StoryState(),contract=null,baseDefinition=null,deviceControl=null,devicePointer=null,faultStation=null;
let paused=false,animationAction='idle',animationTime=0,recoilUntil=0,turningUntil=0,lastNear=null;
let gustActive=false;
let settings={music:.38,effects:.7,haptics:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
try{const options=JSON.parse(localStorage.getItem('ice-options-v1')||'{}');for(const k of ['music','effects'])if(Number.isFinite(options[k]))settings[k]=Math.max(0,Math.min(1,options[k]));for(const k of ['haptics','reducedMotion'])if(typeof options[k]==='boolean')settings[k]=options[k];}catch{}
let activeOperator=null,operatorConsults=0,repairDone=false,feedbackUntil=0,saveAtSimTime=0,gameRestored=false;
const advice={
 backyard:{deviceId:'mainAir',value:0.52,cue:'≋ ◇'},
 warehouse:{deviceId:'draft',value:0.72,cue:'↻ ⚒'},
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
  player:{x:s.x,y:s.y,climbing:s.climbing,grounded:s.grounded,facing:s.facing},
  economy:{funds},
  progression:{completed:[...completedJobs],operatorConsults,repairDone,story:story.snapshot()},
  scene:{id:scene.id,stage,practice},
  controls:{...preferences},
  mission:stage!=='hub'&&job&&burner?{jobId:job.id,stage,process:burner.snapshot(),contract:contract?.snapshot()??null,
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
  if(row){row.querySelector('output').textContent=x.occupied?(x.source==='backup'?'↶ ':'✓ ')+(x.sceneId==='hub'?'⌂':JOBS.find(j=>j.id===x.sceneId)?.symbol??'◇')+' ◈'+Math.round(x.funds??0):'◇';row.title=x.savedAtUtc?'Saved '+new Date(x.savedAtUtc).toLocaleString():'Empty slot';}
  const load=row?.querySelector('[data-load-slot]');
  if(load)load.disabled=!x.occupied;
 }
}
function openSaves(){closeOperator();closeDevice();closeFault();$('pause-panel').hidden=true;paused=false;$('save-panel').hidden=false;refreshSlots();clearInput();orchestra.suspend();sound.stop();}
function closeSaves(){$('save-panel').hidden=true;clearInput();}
function restoreState(snapshot){
 if(!validGameState(snapshot))return false;
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
 story=new StoryState(snapshot.progression?.story);
 operatorAI.restore(snapshot.operator);
 closeOperator();closeSaves();stopWatching();closeDevice();closeFault();paused=false;$('pause-panel').hidden=true;$('contract-result').hidden=true;
 stage='hub';practice=false;job=null;burner=null;evaluator=null;
 let chosen=JOBS.find(j=>j.id===snapshot.mission?.jobId);
 const savedStage=snapshot.scene.stage;
 if(chosen&&['mission','won','failed'].includes(savedStage)){
  job=chosen;burner=new BurnerSolver(chosen.burner);baseDefinition={...burner.definition};evaluator=new MissionEvaluator(chosen);contract=new ContractSession(chosen.id,snapshot.mission.contract);
  const data=snapshot.mission.process||{};
  for(const [name,value] of Object.entries(data.devices||{})){
   if(Object.hasOwn(burner.devices,name)&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1)
    burner.setDevice(name,Math.min(value,contract.limit(name)));
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
  contract=null;baseDefinition=null;
  clocks.resetMission();
  if(snapshot.scene.id==='hub'&&snapshot.scene.practice===true){
   practice=true;job=JOBS[0];burner=new BurnerSolver(job.burner);
  }
 }
 setScene(stage==='hub'?SCENES.hub:SCENES[job.id]);
 player.restorePosition(snapshot.player,scene);
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
  $('fullscreen').innerHTML='<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="'+(active?'M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5':'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5')+'"/></svg>';
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
const playSound=()=>sound.unlock().then(()=>{if(sound.context)orchestra.attach(sound.context);}).catch(()=>{});
document.addEventListener('pointerdown',playSound,{capture:true});
function camera(){return player.camera(scene,{width:world.width,height:world.height});}
function resize(){
  const r=viewport.getBoundingClientRect();
  if(r.width&&r.height){const h=Math.max(1,Math.round(VIEWPORT.width*r.height/r.width));if(world.width!==VIEWPORT.width)world.width=VIEWPORT.width;if(world.height!==h)world.height=h;}
  renderWorld();
}
function distance(i){const s=player.state;return Math.hypot(i.x-s.x-s.w/2,i.y-s.y-s.h/2);}
function near(id,r=112){const i=scene.interactions.find(x=>x.id===id);return !!i&&distance(i)<=r;}
function clearInput(){held.clear();keys.clear();pointers.clear();resetStick();}
function setScene(next){scene=next;player.setScene(scene);clearInput();closeOperator();closeFault();animationAction='idle';animationTime=0;$('hint').hidden=true;}
function updateControls(){
  const board=stage==='hub'&&near('contracts');
  for(const b of buttons){b.disabled=!board;b.classList.toggle('selected',job?.id===b.dataset.job);b.dataset.complete=String(completedJobs.has(b.dataset.job));}
  $('spark').disabled=!(stage==='mission'&&near('spark'))&&!(stage==='hub'&&practice&&near('practice'));
  $('observe').disabled=!watching&&!(stage==='mission'&&near('port'))&&!(stage==='hub'&&practice&&near('practice'));
  $('return').disabled=stage==='hub'&&!watching;
}
function closeDevice(){deviceControl?.end();deviceControl=null;devicePointer=null;selected=null;$('device-panel').hidden=true;}
function closeFault(){faultStation=null;$('fault-panel').hidden=true;}
function stopWatching(){watching=false;$('inspection').hidden=true;viewport.classList.remove('observing');$('observe').setAttribute('aria-pressed','false');}
function beginJob(id){
  const chosen=JOBS.find(x=>x.id===id);
  if(!chosen||stage!=='hub'||!near('contracts')||funds<=0)return;
  stopWatching();closeDevice();practice=false;job=chosen;burner=new BurnerSolver(chosen.burner);baseDefinition={...burner.definition};evaluator=new MissionEvaluator(chosen);contract=new ContractSession(chosen.id);
  stage='mission';setScene(SCENES[chosen.id]);particles.clear();clocks.resetMission();
  repairDone=false;
  $('contract-result').hidden=true;
  $('result').textContent=chosen.symbol;$('result').setAttribute('aria-label',chosen.label);$('hint').hidden=true;updateControls();playSound();autosave();
}
function backToHub(){
  if(stage==='hub'){if(watching)stopWatching();updateControls();return;}
  stopWatching();closeDevice();stage='hub';job=null;burner=null;evaluator=null;contract=null;baseDefinition=null;practice=false;particles.clear();setScene(SCENES.hub);$('contract-result').hidden=true;
  $('result').textContent='⌂';$('result').setAttribute('aria-label','Backyard hub');$('progress-fill').style.width='0%';$('progress').setAttribute('aria-valuenow','0');sound.stop();updateControls();autosave();
}
function resetGame(){funds=110;completedJobs.clear();operatorConsults=0;repairDone=false;operatorAI.reset();story=new StoryState();contract=null;paused=false;$('pause-panel').hidden=true;$('contract-result').hidden=true;if(stage!=='hub')backToHub();else{stopWatching();closeDevice();practice=false;burner=null;job=null;particles.clear();setScene(SCENES.hub);sound.stop();}clocks.resetMission();$('tutorial').hidden=false;updateControls();autosave();}
function toggleObservation(){
  if(!watching&&!(stage==='mission'&&near('port'))&&!(stage==='hub'&&practice&&near('practice')))return;
  watching=!watching;if(watching){closeDevice();closeFault();closeOperator();clearInput();contract?.inspect();drawChamber();}
  $('inspection').hidden=!watching;viewport.classList.toggle('observing',watching);$('observe').setAttribute('aria-pressed',String(watching));playSound();updateControls();
}
function spark(){
  if(!((stage==='mission'&&near('spark'))||(stage==='hub'&&practice&&near('practice')))||!burner)return;
  playSound();sound.click();emitCue('pilot.spark.begin');const state=burner.ignite();handleEvents(state.events);
}
function showDevice(i){
  if(stage!=='mission'||!burner||distance(i)>112)return;
  selected=i;$('device-panel').hidden=false;$('device-symbol').textContent=icons[i.deviceId]||'◆';
  const jammed=job?.id==='warehouse'&&i.deviceId==='draft'&&!contract?.repaired;
  $('device-slider').max=jammed?58:100;$('device-repair').hidden=!jammed;
  deviceControl=new DeviceControl({kind:/Air|draft/.test(i.deviceId)?'damper':'valve',value:burner.devices[i.deviceId],max:contract?.limit(i.deviceId)??1});
  $('device-name').textContent=i.label;$('device-feedback').textContent=jammed?'⚒ Inspect → repair → test full travel':deviceControl.kind==='valve'?'↻ Rotate the wheel · ± one detent':'↕ Drag the lever · ± one detent';
  $('device-wheel').setAttribute('aria-label',deviceControl.kind==='valve'?'Rotate '+i.label+' wheel':'Move '+i.label+' lever');
  $('device-slider').value=Math.min(Number($('device-slider').max),Math.round(burner.devices[i.deviceId]*100));
  $('device-slider').setAttribute('aria-label',i.label);
  clearInput();drawDevice();
  if(jammed)cue('⚒ ↻','Draft damper stuck at 58%; repair nearby to restore travel');
}
function interact(){
  if(paused||!$('save-panel').hidden)return;
  if(!$('fault-panel').hidden){closeFault();return;}
  if(!$('operator-panel').hidden){closeOperator();return;}
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
  }else if(i.type==='repair'){
    faultStation=i;$('fault-panel').hidden=false;$('fault-description').textContent=contract?.repaired?'✓ Intake shield secured. Wind still affects draft; use the calibrated gauges.':contract?.inspected?'The intake shield is loose. Secure its latches with the calibrated kit.':'◎ Inspect the chamber through its observation port first.';
    $('fault-repair').disabled=!contract?.inspected||contract?.repaired;clearInput();
  }else if(i.type==='npc'){
    activeOperator=i;$('operator-panel').hidden=false;$('operator-assist').disabled=!(stage==='mission'&&burner)||(advice[job?.id]?.value??0)>(contract?.limit(advice[job?.id]?.deviceId)??1);
    story.record('meet');const d=story.dialogue({jobId:job?.id??null,mainLit:!!burner?.mainLit,damperRepaired:!!contract?.repaired});$('operator-dialogue').textContent=d.icon+' '+d.text+(contract&&!contract.repaired?' '+CONTRACTS[job.id].hint:'');
    for(const [id,element] of [['diagnose','operator-guide'],['assist','operator-assist'],['independent','operator-independent']])$(element).hidden=!d.options.some(o=>o.id===id);clearInput();
    cue('☻ ◇','Operator: ask for diagnosis or request local assistance');
    autosave();
  }else if(i.type==='workbench'){
    openMenu(true);
  }
}
for(const b of buttons)b.addEventListener('click',()=>beginJob(b.dataset.job));
$('spark').addEventListener('click',spark);$('observe').addEventListener('click',toggleObservation);$('return').addEventListener('click',backToHub);$('reset').addEventListener('click',resetGame);
$('tutorial-ok').addEventListener('click',()=>{$('tutorial').hidden=true;playSound();});
$('tutorial-help').addEventListener('click',()=>{openMenu(true);});
$('inspection-close').addEventListener('click',toggleObservation);
$('diagnostics-toggle').addEventListener('click',()=>{$('diagnostics').hidden=!$('diagnostics').hidden;$('diagnostics-toggle').setAttribute('aria-pressed',String(!$('diagnostics').hidden));});
$('fault-close').addEventListener('click',closeFault);
$('fault-repair').addEventListener('click',()=>{
 if(!faultStation||distance(faultStation)>112||!contract?.repair('secure-intake'))return;
 story.record('diagnose',job.id);emitCue('repair.complete');cue('☂ ⚒ ✓','Intake shield secured; crosswind disturbance reduced');closeFault();autosave();
});
$('device-close').addEventListener('click',()=>{closeDevice();playSound();});
$('device-repair').addEventListener('click',()=>{
 if(job?.id!=='warehouse'||selected?.deviceId!=='draft'||contract?.repaired||distance(selected)>112)return;
 if(!contract.repair('free-damper')){cue('◎ → ⚒','Inspect the flame at the observation port before repairing');return;}
 repairDone=true;$('device-slider').max=100;$('device-repair').hidden=true;if(deviceControl)deviceControl.max=1;
 $('device-feedback').textContent='⚒ ✓ Linkage freed. Test travel beyond the old stop.';
 cue('⚒ ✓','Damper repaired with calibrated tools; full draft travel restored');emitCue('repair.complete');autosave();
});
$('operator-close').addEventListener('click',closeOperator);
$('operator-guide').addEventListener('click',()=>{
 if(!activeOperator||distance(activeOperator)>112){closeOperator();return;}
 operatorConsults++;
 story.record('diagnose',job?.id??null);
 const state=burner?.snapshot();
 const hint=job?.id==='warehouse'?(contract?.repaired?'↻ ↑ ◎':'◎ ⚒ ↻'):
  job?.id==='heat-hold'?'◆ ≋ ♨ ◎':
  job?.id==='backyard'?(contract?.repaired?'≋ ◎':'☂ ⚒'):
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
  applyDevice(target.deviceId,target.value);operatorConsults++;story.record('assist',job.id);emitCue('valve.rotate');cue(target.cue+' ✓','Operator adjusted adjacent '+target.deviceId+' valve');
  autosave();
 }else cue('✕ '+result.cue,'Operator refused: '+result.reason);
 closeOperator();
});
$('operator-independent').addEventListener('click',()=>{story.record('independent',job?.id??null);cue('☞ ✓','Independent operation selected');closeOperator();autosave();});
$('save-menu').addEventListener('click',()=>$('save-panel').hidden?openSaves():closeSaves());
$('save-close').addEventListener('click',closeSaves);
for(const b of document.querySelectorAll('[data-save-slot]'))b.addEventListener('click',()=>{
 const id=Number(b.dataset.saveSlot),result=saveStore.saveSlot(id,captureState());
 cue(result.ok?'▣ '+id+(result.verified===false?' ?':' ✓'):'▣ ✕',result.verified===false?'Save committed; verification unavailable. Reload to confirm.':result.ok?'Saved slot '+id:'Save failed; previous committed save retained');
 refreshSlots();
});
for(const b of document.querySelectorAll('[data-load-slot]'))b.addEventListener('click',()=>{
 const id=Number(b.dataset.loadSlot);
 if(!saveStore.listSlots().some(s=>s.id===id&&s.occupied))return;
 if(restoreState(saveStore.loadSlot(id))) {autosave();cue('↶ '+id+' ✓','Loaded save slot '+id);}
 else cue('▣ ✕','Save slot is unavailable or invalid');
});
$('device-slider').addEventListener('input',()=>{if(selected&&deviceControl)commitControl(deviceControl.set(Number($('device-slider').value)/100));});
$('device-less').addEventListener('click',()=>{if(deviceControl)commitControl(deviceControl.nudge(-1));});
$('device-more').addEventListener('click',()=>{if(deviceControl)commitControl(deviceControl.nudge(1));});
const wheel=$('device-wheel');
wheel.addEventListener('pointerdown',e=>{
 if(!deviceControl||devicePointer!==null)return;e.preventDefault();playSound();devicePointer=e.pointerId;wheel.setPointerCapture(e.pointerId);const r=wheel.getBoundingClientRect();deviceControl.begin((e.clientX-r.left)*260/r.width,(e.clientY-r.top)*220/r.height,130,110);
});
wheel.addEventListener('pointermove',e=>{if(!deviceControl||devicePointer!==e.pointerId)return;e.preventDefault();const r=wheel.getBoundingClientRect();commitControl(deviceControl.move((e.clientX-r.left)*260/r.width,(e.clientY-r.top)*220/r.height));});
for(const type of ['pointerup','pointercancel','lostpointercapture'])wheel.addEventListener(type,e=>{if(devicePointer===e.pointerId){devicePointer=null;deviceControl?.end();autosave();}});
wheel.addEventListener('keydown',e=>{if(!deviceControl)return;if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();e.stopPropagation();commitControl(deviceControl.nudge(['ArrowUp','ArrowRight'].includes(e.key)?1:-1,e.shiftKey));}});
$('interact').addEventListener('click',interact);flame.addEventListener('pointerdown',toggleObservation);
for(const b of document.querySelectorAll('[data-hold]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();pointers.set(e.pointerId,b.dataset.hold);held.add(b.dataset.hold);b.setPointerCapture(e.pointerId);});
  const release=e=>{const action=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(action&&![...pointers.values()].includes(action))held.delete(action);};
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
}
const keyActions={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'jump',j:'jump'};
document.addEventListener('keydown',e=>{
  if(e.target.matches('input')||e.target===wheel)return;
  const k=e.key.length===1?e.key.toLowerCase():e.key,a=keyActions[k];
  if(a){keys.add(a);e.preventDefault();}else if(k==='e'&&!e.repeat){interact();e.preventDefault();}else if(k==='Escape'){if(paused)closeMenu();else if(!$('save-panel').hidden)closeSaves();else if(watching)toggleObservation();else if(selected)closeDevice();else if(activeOperator)closeOperator();else if(faultStation)closeFault();else openMenu();}
});
document.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(keyActions[k]){keys.delete(keyActions[k]);e.preventDefault();}});
window.addEventListener('blur',()=>{clearInput();deviceControl?.end();devicePointer=null;});document.addEventListener('visibilitychange',()=>{if(document.hidden){autosave();clearInput();deviceControl?.end();devicePointer=null;orchestra.suspend();sound.stop();frameLast=0;}else{frameLast=0;}});window.addEventListener('pagehide',()=>{autosave();orchestra.suspend();});window.addEventListener('resize',resize);
function emitCue(name){orchestra.cue(name,settings.effects);}
function handleEvents(events=[]){for(const event of events){emitCue(event);if(event==='combustion.puff'||event==='chamber.overheat')recoilUntil=worldTime+.42;}}
function applyDevice(id,value){
 if(stage!=='mission'||!burner||!Object.hasOwn(burner.devices,id))return false;
 const next=Math.max(0,Math.min(contract?.limit(id)??1,value)),previous=burner.devices[id];
 burner.setDevice(id,next);contract?.adjust(id,previous,next);turningUntil=worldTime+.35;return true;
}
let lastDetent=-100;
function commitControl(change){
 if(!selected||!deviceControl||distance(selected)>112){closeDevice();return;}
 if(!applyDevice(selected.deviceId,change.value))return;
 deviceControl.value=burner.devices[selected.deviceId];$('device-slider').value=Math.round(deviceControl.value*100);
 if(change.detent&&worldTime-lastDetent>.055){emitCue('valve.rotate');lastDetent=worldTime;if(settings.haptics&&navigator.vibrate)navigator.vibrate(8);}
 drawDevice();
}
function drawDevice(){
 if(!deviceControl||!selected)return;
 const c=wheel.getContext('2d'),v=deviceControl.value;const box=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 c.clearRect(0,0,260,220);box('#0b1c24',0,0,260,220);box('#496568',12,12,236,196);box('#304d54',17,17,226,186);
 for(const x of [24,230])for(const y of [24,188]){box('#102b32',x-4,y-4,10,10);box('#c3b88f',x-2,y-2,5,5);}
 if(deviceControl.kind==='valve'){
  box('#182e35',115,18,30,184);box('#809190',120,20,7,179);
  c.save();c.translate(130,110);c.rotate(-Math.PI*.75+v*Math.PI*1.5);
  c.strokeStyle='#17272c';c.lineWidth=20;c.beginPath();for(let i=0;i<9;i++){const a=i*Math.PI/4;i?c.lineTo(Math.cos(a)*68,Math.sin(a)*68):c.moveTo(Math.cos(a)*68,Math.sin(a)*68);}c.stroke();
  c.strokeStyle='#d58d4c';c.lineWidth=11;c.stroke();c.strokeStyle='#edb773';c.lineWidth=3;c.stroke();
  c.strokeStyle='#ca8047';c.lineWidth=9;for(let i=0;i<3;i++){const a=i*Math.PI*2/3;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*66,Math.sin(a)*66);c.stroke();}
  box('#d5bb86',-12,-12,24,24);box('#354d52',-5,-5,10,10);box('#ffe6a7',60,-4,12,8);c.restore();
 }else{
  box('#102830',56,32,148,156);box('#718887',63,39,134,142);
  for(let y=50;y<180;y+=23){box('#304a53',68,y,124,7);box('#a3b6a7',68,y+Math.round(v*13),124,4);}
  box('#0e252e',119,27,22,166);box('#bdc4a9',126,33,5,150);const y=175-v*132;
  box('#15333b',96,y-9,68,24);box('#d99d54',100,y-12,60,20);box('#f3ca85',105,y-10,50,4);
 }
 for(let i=0;i<=10;i++){const x=39+i*18;box(i/10<=v?'#e3bd72':'#1b343b',x,207,12,5);}
 $('device-reading').textContent=Math.round(v*100)+'%';wheel.setAttribute('aria-valuenow',String(Math.round(v*100)));wheel.setAttribute('aria-valuemax',String(Math.round(deviceControl.max*100)));
}
function applySettings(){
 sound.volume=settings.effects;orchestra.volume=settings.music;document.body.dataset.effects=settings.reducedMotion?'reduced':'full';
 $('music-volume').value=Math.round(settings.music*100);$('effects-volume').value=Math.round(settings.effects*100);
 $('haptics-toggle').setAttribute('aria-pressed',String(settings.haptics));$('motion-toggle').setAttribute('aria-pressed',String(settings.reducedMotion));
 try{localStorage.setItem('ice-options-v1',JSON.stringify(settings));}catch{}
}
function openMenu(help=false){
 closeDevice();closeOperator();closeFault();closeSaves();paused=true;$('pause-panel').hidden=false;$('help').open=help;clearInput();orchestra.suspend();sound.stop();autosave();
}
function closeMenu(){paused=false;$('pause-panel').hidden=true;clearInput();frameLast=0;playSound();}
$('menu-open').addEventListener('click',()=>paused?closeMenu():openMenu());$('menu-resume').addEventListener('click',closeMenu);$('menu-saves').addEventListener('click',openSaves);
$('music-volume').addEventListener('input',()=>{settings.music=Number($('music-volume').value)/100;applySettings();});
$('effects-volume').addEventListener('input',()=>{settings.effects=Number($('effects-volume').value)/100;applySettings();});
$('haptics-toggle').addEventListener('click',()=>{settings.haptics=!settings.haptics;applySettings();});
$('motion-toggle').addEventListener('click',()=>{settings.reducedMotion=!settings.reducedMotion;applySettings();});
$('result-return').addEventListener('click',backToHub);
applySettings();
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
  player.update(1/60,watching||!$('tutorial').hidden||!$('device-panel').hidden||!$('operator-panel').hidden||!$('fault-panel').hidden||!$('save-panel').hidden?{x:0,y:0,jump:false}:movement(),scene);
  const nextAction=worldTime<recoilUntil?'recoil':worldTime<turningUntil?'valve':watching?'observe':player.state.climbing?'climb':Math.abs(player.state.vx)>4&&player.state.grounded?'walk':'idle';
  if(nextAction!==animationAction){animationAction=nextAction;animationTime=0;}
  const previousTime=animationTime;animationTime+=1/60;
  for(const event of animationEvents(animationAction,previousTime,animationTime))emitCue(event.name);
  if(selected&&distance(selected)>112)closeDevice();
  if(faultStation&&distance(faultStation)>112)closeFault();
  if(activeOperator&&distance(activeOperator)>112)closeOperator();
  if(stage!=='failed'&&funds>0)funds=Math.max(0,funds-.32*cashDt);
  if(!burner||!(stage==='mission'||(stage==='hub'&&practice)))return;
  if(contract&&baseDefinition){const biome=environmentAt(scene.id,burner.time);Object.assign(burner.definition,contract.environment(baseDefinition,biome,burner.time));if(biome.wind>.48&&!gustActive)emitCue('biome.wind_gust');gustActive=biome.wind>.48;}
  const state=burner.step(processDt);particles.step(processDt,state,CHAMBERS[job.chamber]);sound.update(state,watching);handleEvents(state.events);
  if(stage!=='mission')return;
  const ready=contract?.tick(processDt,state,watching)??true;
  const outcome=evaluator.tick(processDt,missionDt,ready?state:{...state,mainLit:false},funds);
  if(outcome==='won'||outcome==='failed'){
    stage=outcome;if(outcome==='won'){funds+=job.payout;completedJobs.add(job.id);story.record('complete',job.id);emitCue('mission.stable');}else emitCue('mission.fail');
    $('result').textContent=outcome==='won'?'✓':'✕';$('result').setAttribute('aria-label',outcome==='won'?'Contract complete':'Contract failed');
    cue(outcome==='won'?'✓ ◈ '+job.payout:'✕ ◈','Job '+(outcome==='won'?'completed':'failed')+' with payout '+(outcome==='won'?job.payout:0));
    $('contract-result').hidden=false;$('result-mark').textContent=outcome==='won'?'✓':'✕';$('result-title').textContent=CONTRACTS[job.id].title;
    $('result-detail').textContent=outcome==='won'?'Contract complete · +'+job.payout+' credits · '+(story.snapshot().choice==='assisted'?'Operator assisted':'Independent operation'):(contract?.reason(state,funds,clocks.missionTime,job.deadline)??'Process did not hold')+'. Return to the workshop to retry.';
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
function targetStation(){
 if(stage!=='mission'||!contract)return null;const next=contract.next();
 return next==='repair'?scene.interactions.find(i=>i.id===(job.id==='backyard'?'intake-shield':'draft')):next==='adjust'?scene.interactions.find(i=>i.deviceId===contract.definition.device):scene.interactions.find(i=>i.id==='port');
}
function renderWorld(){drawScene(wc,scene,{camera:camera(),player:{...player.state,pose:samplePose(animationAction,animationTime)},time:worldTime,process:burner?.snapshot(),reducedMotion:settings.reducedMotion,contract:contract?.snapshot(),target:targetStation(),selectedId:selected?.id??player.nearby(scene)?.id??null,stage,jobId:job?.id??null});}
const missionIcons={
 'burner-failed':'✕','funds-depleted':'◈','deadline':'⌛',
 'temperature-high':'♨','temperature-low':'❄','soot-high':'▧',
 'draft-restricted':'↻','draft-or-flame-unstable':'↻',
 'flame-unstable':'≋','pilot-unlit':'◇','restart-unlit':'◇','heater-unlit':'◇'
};
const missionPriority=['burner-failed','funds-depleted','deadline','temperature-high','soot-high','draft-restricted','draft-or-flame-unstable','flame-unstable','temperature-low','pilot-unlit','restart-unlit','heater-unlit'];
function updateHUD(){
  $('cash').value=funds.toFixed(1);$('mission-clock').value=clocks.missionTime.toFixed(0);$('temperature').value=(burner?.temperature??.12).toFixed(2);
  const pct=evaluator?Math.round(evaluator.progress()*100):0;$('progress-fill').style.width=pct+'%';$('progress').setAttribute('aria-valuenow',String(pct));
  const indicator=$('mission-cue');
  if(stage==='mission'&&burner&&job){
   const issues=missionWarnings(getJobTemplate(job.id),burner.snapshot(),{money:funds,elapsed:clocks.missionTime});
   const warn=missionPriority.find(w=>issues.includes(w));
   indicator.hidden=!warn;
   if(warn){
    indicator.textContent=missionIcons[warn]||'!';
    if(indicator.getAttribute('aria-label')!=='Process warning: '+warn)
     indicator.setAttribute('aria-label','Process warning: '+warn);
   }
  }else indicator.hidden=true;
  updateControls();
  const strip=$('objective-strip');strip.hidden=stage!=='mission';
  if(contract&&stage==='mission'){
   const markup=contract.steps().map(s=>'<span class="objective-step '+(s.done?'done':contract.next()===s.id?'current':'')+'" aria-label="'+s.id+' '+(s.done?'complete':'pending')+'">'+s.icon+(s.done?' ✓':'')+'</span>').join('');if(strip.innerHTML!==markup)strip.innerHTML=markup;
  }
  const nearest=player.nearby(scene),context=watching?'':nearest?(nearest.type==='contracts'?'✦ ▤ ◉ · Contract board':nearest.type==='repair'?'☂ ⚒ · Intake shield':nearest.type==='npc'?'☻ · Operator':nearest.type==='workbench'?'⚒ · Calibrated kit':nearest.type==='device'?(icons[nearest.deviceId]+' · '+nearest.label):nearest.type==='observation'?'◎ · Inspect / verify':nearest.type==='ignition'?'ϟ · Ignite pilot':'✋ · '+nearest.label):'';
  if(lastNear!==context){$('context-hint').textContent=context;lastNear=context;}
  if(watching&&burner){const s=burner.snapshot();$('gauge-heat').value=s.temperature;$('gauge-stability').value=s.stability;$('gauge-soot').value=s.soot;$('flame-status').textContent=s.mainLit?'◇ → ◆ ✓':s.pilotLit?'◇ ✓ → ◆':'◇ → ϟ';$('observation-note').textContent=contract?.steps().map(x=>x.icon+(x.done?'✓':'')).join(' → ')??'◎';$('diagnostics').textContent='CALIBRATED KIT · dimensionless game values\n'+['temperature','stability','soot','mainRatio','airFlow','fuelFlow'].map(k=>k.padEnd(12)+' '+s[k].toFixed(2)).join('\n');}
}
function frame(now){
  if(!frameLast)frameLast=now;const dt=(now-frameLast)/1000;frameLast=now;
  const frozen=paused||!$('save-panel').hidden||!$('tutorial').hidden||document.hidden;
  if(!frozen)worldTime+=Math.min(dt,.1);
  const frames=frozen?{world:false,flame:false,steps:0}:clocks.advance(dt,watching,physicsStep);
  if(frames.world)renderWorld();if(frames.flame&&watching)drawChamber();
  if(worldTime>feedbackUntil&&!$('hint').hidden)$('hint').hidden=true;
  if(clocks.simTime-saveAtSimTime>=18){saveAtSimTime=clocks.simTime;autosave();}
  orchestra.update({sceneId:scene.id,tension:burner?.mainLit?Math.max(.35,1-burner.stability):.18,paused:frozen});
  updateHUD();requestAnimationFrame(frame);
}
resize();updateControls();renderWorld();
try{const loaded=saveStore.readAutosave();gameRestored=restoreState(loaded.snapshot);if(loaded.source==='backup')cue('▣ ↶ ✓','Recovered autosave from its verified backup');}catch{gameRestored=false;}
if(!gameRestored){refreshSlots();}
window.ICE_DEBUG=Object.freeze({snapshot:()=>{const c=camera(),s=player.state;return {stage,watching,funds,missionTime:clocks.missionTime,playerX:s.x,job:job?.id??null,solver:burner?.snapshot()??null,objective:evaluator?.progress()??0,particles:particles.activeCount(),playerY:s.y,cameraX:c.x,cameraY:c.y,sceneId:scene.id,worldWidth:scene.width,worldHeight:scene.height,grounded:s.grounded,climbing:s.climbing,controls:preferences.mode,hand:preferences.hand,stickX:stick.x,stickY:stick.y,fullscreen:document.fullscreenElement===game,completed:[...completedJobs],savedSlots:saveStore.listSlots().map(x=>({id:x.id,occupied:x.occupied})),operatorConsults,repairDone,autosaveRestored:gameRestored,paused:paused||!$('save-panel').hidden,contract:contract?.snapshot()??null,story:story.snapshot(),animationAction,audio:orchestra.snapshot(),soundEnabled:sound.enabled,kit:{calibrated:true,allTools:true},effective:burner?{airflowFactor:burner.definition.airflowFactor,draftFactor:burner.definition.draftFactor,heatLoss:burner.definition.heatLoss}:null};}});
requestAnimationFrame(frame);

