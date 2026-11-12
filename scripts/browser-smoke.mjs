// Dependency-free Chrome DevTools Protocol smoke test for the mobile game.
// Tests actual touchscreen input and captures a screenshot as build evidence.
import http from 'node:http';
import {readFile,stat,mkdir,writeFile,rm,mkdtemp} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
const root=resolve(process.cwd());
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const web=http.createServer(async(req,res)=>{
 try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   let file=resolve(root,'.'+pathname);
   if(!(file===root||file.startsWith(root+sep))){res.writeHead(403).end();return;}
   const info=await stat(file);
   if(info.isDirectory())file=join(file,'index.html');
   const content=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
   res.end(content);
 }catch{res.writeHead(404).end('not found');}
});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const executable=process.env.CHROME_BIN||
  ['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(x=>spawnSync('which',[x]).status===0);
if(!executable){console.error('Chrome executable is required for browser acceptance');process.exit(1);}
let browser=null,ws=null,profileDir=null;
const exceptions=[];
async function main(){
 web.listen(0,'127.0.0.1');await once(web,'listening');
 const port=web.address().port,url='http://127.0.0.1:'+port+'/game/';
 profileDir=await mkdtemp(join(tmpdir(),'ice-chrome-'));
 browser=spawn(executable,[
   '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
   '--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
   '--user-data-dir='+profileDir,url
 ],{stdio:['ignore','ignore','pipe']});
 // Some GitHub-hosted Chrome runners initialize silently. Accept the actual
 // DevToolsActivePort handshake as well as stderr, without skipping browser QA.
 const debugPort=await new Promise((resolvePort,reject)=>{
   let output='',settled=false;
   const done=(error,port)=>{
     if(settled)return;
     settled=true;clearTimeout(timeout);clearInterval(poll);
     if(error)reject(error);else resolvePort(port);
   };
   const timeout=setTimeout(()=>done(Error('Chrome DevTools did not start within 35 seconds: '+output.slice(-550))),35000);
   const poll=setInterval(async()=>{
     try{
       const data=await readFile(join(profileDir,'DevToolsActivePort'),'utf8');
       const port=Number(data.split(/\r?\n/)[0]);
       if(Number.isInteger(port)&&port>0)done(null,port);
     }catch{ /* Chrome has not published the port yet. */ }
   },250);
   browser.stderr.on('data',chunk=>{
     output+=String(chunk);
     const match=output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
     if(match)done(null,Number(match[1]));
   });
   browser.on('exit',code=>done(Error('Chrome exited '+code+' '+output.slice(-550))));
   browser.on('error',error=>done(error));
 });
 let target;
 for(let i=0;i<40;i++){
   const targets=await fetch('http://127.0.0.1:'+debugPort+'/json/list').then(r=>r.json());
   target=targets.find(x=>x.type==='page'&&x.url.includes('/game/'));
   if(target)break;
   await delay(100);
 }
 if(!target)throw Error('Game page not found in Chrome');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{
   ws.addEventListener('open',ok,{once:true});
   ws.addEventListener('error',fail,{once:true});
 });
 const pending=new Map();let nextId=0;
 ws.addEventListener('message',e=>{
   const m=JSON.parse(String(e.data));
   if(m.id&&pending.has(m.id)){
     const {ok,fail}=pending.get(m.id);pending.delete(m.id);
     if(m.error)fail(Error('CDP '+JSON.stringify(m.error)));else ok(m.result);
   }else if(m.method==='Runtime.exceptionThrown'){
     exceptions.push(m.params?.exceptionDetails?.text||'Runtime.exceptionThrown');
   }
 });
 const command=(method,params={})=>new Promise((ok,fail)=>{
   const id=++nextId;pending.set(id,{ok,fail});
   ws.send(JSON.stringify({id,method,params}));
 });
 const evalJs=async expression=>{
   const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error('Page JS exception: '+r.exceptionDetails.text);
   return r.result?.value;
 };
 const center=selector=>evalJs('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
 const tap=async selector=>{
   const {x,y}=await center(selector);
   await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await delay(170);
 };
 await command('Runtime.enable');
 await command('Page.enable');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
 await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await command('Page.reload',{ignoreCache:true});
 let boot=false;
 for(let i=0;i<60;i++){await delay(100);if(await evalJs('Boolean(window.ICE_DEBUG)')){boot=true;break;}}
 if(!boot)throw Error('Game JS did not initialize');
 await tap('#tutorial-ok');
 const majorBuild=await evalJs("document.querySelector('meta[name=\"ice-build\"]')?.content==='20261111-major-pass-one-01'");
 if(majorBuild){
   const snapshot=()=>evalJs('window.ICE_DEBUG.snapshot()');
   let state=await snapshot();
   if(state.sceneId!=='hub'||state.worldHeight<2400||state.worldWidth<1200)
     throw Error('Major world is not connected: '+JSON.stringify(state));
   const layout=await evalJs("(()=>{const r=document.querySelector('#viewport').getBoundingClientRect();return {height:r.height,screen:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};})()");
   if(layout.height<layout.screen*.55||layout.overflow)throw Error('Portrait world does not dominate the screen: '+JSON.stringify(layout));
   const buttonPoint=label=>evalJs('(()=>{const b=Array.from(document.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")==='+JSON.stringify(label)+'||b.textContent.trim()==='+JSON.stringify(label)+');if(!b)throw Error("Missing control");const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})()');
   const hold=async(label,ms)=>{
     const point=await buttonPoint(label);
     if(point.w<44||point.h<44)throw Error('Small major-build touch target '+label);
     await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1}]});
     await delay(ms);
     await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await delay(50);
   };
   // Pass Two defaults to a real analog left-thumb joystick. Verify pointer movement,
   // neutral return, alternate thumb-side and a usable physical D-pad fallback.
   if((await snapshot()).controls!=='joystick')throw Error('Pass Two should boot in joystick mode');
   const fullscreenControl=await buttonPoint('Enter fullscreen');
   if(fullscreenControl.w<44||fullscreenControl.h<44)throw Error('Fullscreen control is not thumb accessible');
   const joyBounds=await evalJs("(()=>{const r=document.querySelector('#joystick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})()");
   if(joyBounds.w<80||joyBounds.h<80)throw Error('Joystick contact area too small');
   const startX=state.playerX;
   await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joyBounds.x+joyBounds.w*.33,y:joyBounds.y,id:1}]});
   await delay(260);await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(80);
   state=await snapshot();
   if(state.playerX<=startX+8)throw Error('Real thumb joystick did not move the player');
   if(state.stickX!==0||state.stickY!==0)throw Error('Joystick remained stuck after release');
   await tap('#handedness');
   if((await snapshot()).hand!=='right')throw Error('Handedness preference did not switch');
   await tap('#handedness');
   await tap('#controls-mode');
   if((await snapshot()).controls!=='buttons')throw Error('D-pad fallback did not activate');
   for(const label of ['Move left','Move right','Climb up','Climb down','Jump','Interact'])await buttonPoint(label);
   const initialY=state.playerY,initialCamera=state.cameraY;
   await hold('Jump',90);await delay(100);state=await snapshot();
   if(state.playerY>=initialY-3)throw Error('Actual touch jump did not move the player');
   for(let i=0;i<45&&!state.grounded;i++){await delay(80);state=await snapshot();}
   if(!state.grounded)throw Error('Player did not land after touch jump');
   const hub=await evalJs("import('./world/industrial-yard.mjs').then(m=>m.SCENES.hub)");
   let climbed=0;
   for(let floor=0;floor<2;floor++){
     state=await snapshot();
     const choices=hub.ladders.filter(l=>Math.abs(l.y+l.h-(state.playerY+52))<45)
       .sort((a,b)=>Math.abs(a.x+a.w/2-state.playerX-14)-Math.abs(b.x+b.w/2-state.playerX-14));
     const ladder=choices[0];if(!ladder)throw Error('No reachable upward ladder on current floor');
     const targetX=ladder.x+ladder.w/2;
     for(let i=0;i<30;i++){
       state=await snapshot();const dx=targetX-state.playerX-14;
       if(Math.abs(dx)<Math.max(6,ladder.w/2-8))break;
       await hold(dx>0?'Move right':'Move left',Math.max(25,Math.min(220,Math.abs(dx)*3)));
     }
     state=await snapshot();
     if(Math.abs(targetX-state.playerX-14)>ladder.w/2)throw Error('Held touch movement did not align with ladder');
     const beforeY=state.playerY;
     for(let i=0;i<36;i++){
       await hold('Climb up',250);state=await snapshot();
       if(state.playerY+52<=ladder.y+10)break;
     }
     if(beforeY-state.playerY<Math.min(250,ladder.h*.7))throw Error('Actual touch ladder climbing failed');
     climbed+=beforeY-state.playerY;
     if(state.cameraY<initialCamera-20)break;
   }
   state=await snapshot();
   if(climbed<250||state.cameraY>=initialCamera-20)throw Error('Vertical camera did not follow exploration');
   const worldShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   await mkdir('artifacts',{recursive:true});await writeFile('artifacts/mobile-world.png',Buffer.from(worldShot.data,'base64'));
   console.log('PASS MAJOR: actual held-touch walking, edge jump/landing, ladder climb, vertical camera, portrait layout and world screenshot');
   // Start a clean real UI session for the established mission path; never teleport test state.
   await command('Page.reload',{ignoreCache:true});
   for(let i=0;i<60;i++){await delay(100);if(await evalJs('Boolean(window.ICE_DEBUG)'))break;}
   // Pass Two restores the upper-floor position on reload. Verify persistence
   // and explicitly restart before the independent initial-mission test.
   if(await evalJs("document.querySelector('meta[name=\\\"ice-pass-two\\\"]')?.content==='operator-save-missions-01'")){
     const resumed=await snapshot();
     if(!resumed.autosaveRestored||resumed.playerY>=initialY-100)
       throw Error('Real upper-floor autosave did not restore after reload: '+JSON.stringify(resumed));
     console.log('PASS PASS-TWO: reloaded upper-floor position and camera persist');
     await tap('#reset');
     await tap('#tutorial-ok');
   }else if(await evalJs("!document.querySelector('#tutorial').hidden"))await tap('#tutorial-ok');
 }
 await tap('[data-job="backyard"]');
 let data=await evalJs('window.ICE_DEBUG.snapshot()');
 if(data.stage!=='mission'||data.job!=='backyard')throw Error('Touch job selection failed: '+JSON.stringify(data));
 await tap('#spark');await delay(220);
 data=await evalJs('window.ICE_DEBUG.snapshot()');
 if(!data.solver?.pilotLit||!data.solver?.mainLit)throw Error('Ignition did not operate pilot/main: '+JSON.stringify(data));
 await tap('#observe');await delay(600);
 data=await evalJs('window.ICE_DEBUG.snapshot()');
 if(!data.watching||data.particles<=0||data.missionTime<=0)throw Error('Flame observation failed: '+JSON.stringify(data));
 if(await evalJs('getComputedStyle(document.querySelector("#flame")).display')==='none')throw Error('Flame canvas hidden while watching');
 const chamberWall=await evalJs("Array.from(document.querySelector('#flame').getContext('2d').getImageData(30,25,1,1).data)");
 if(chamberWall[3]<250)throw Error('Chamber artwork was erased by particle rendering');
 const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/mobile-flame.png',Buffer.from(shot.data,'base64'));
 await tap('#return');
 data=await evalJs('window.ICE_DEBUG.snapshot()');
 if(data.stage!=='hub')throw Error('Return to hub failed');
 if(exceptions.length)throw Error('Browser exceptions: '+exceptions.join('; '));
 // Connected Pass Two integration: actual local slots, save/load and operator module.
 if(await evalJs("document.querySelector('meta[name=\"ice-pass-two\"]')?.content==='operator-save-missions-01'")){
   await tap('#save-menu');
   if(await evalJs("document.querySelector('#save-panel').hidden"))throw Error('Save panel did not open');
   await tap('[data-save-slot="1"]');
   if(!(await evalJs('window.ICE_DEBUG.snapshot().savedSlots[0].occupied')))
     throw Error('Real save slot one not populated');
   await tap('#save-close');
   await command('Page.reload',{ignoreCache:true});
   let bootAgain=false;
   for(let i=0;i<60;i++){await delay(100);if(await evalJs('Boolean(window.ICE_DEBUG)')){bootAgain=true;break;}}
   if(!bootAgain)throw Error('Saved game did not restart');
   if(!(await evalJs('window.ICE_DEBUG.snapshot().savedSlots[0].occupied')))
     throw Error('Save slot did not survive browser reload');
   await tap('#save-menu');await tap('[data-load-slot="1"]');
   if(await evalJs("document.querySelector('#save-panel').hidden")===false)
     throw Error('Load did not close the save menu');
   const p2=await evalJs('window.ICE_DEBUG.snapshot()');
   if(p2.stage!=='hub'||p2.funds<=0)throw Error('Saved game load invalid: '+JSON.stringify(p2));
   console.log('PASS PASS-TWO: actual touchscreen save/load and reload persistence');
 }

 // Pass Two release route: physical controls only; debug snapshots and authored
 // geometry are read-only observations, never teleports or direct solver writes.
 if(await evalJs("document.querySelector('meta[name=\"ice-release\"]')?.content==='pass-two-operator-02'")){
  const snapshot=()=>evalJs('window.ICE_DEBUG.snapshot()');
  const bounds=selector=>evalJs('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()');
  const hold=async(action,ms)=>{
   const r=await bounds('[data-hold="'+action+'"]');
   if(r.w<44||r.h<44)throw Error('Pass Two touch target too small: '+action);
   await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.w/2,y:r.y+r.h/2,id:1}]});
   await delay(ms);await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(45);
  };
  const until=async(predicate,message,max=80)=>{for(let i=0;i<max;i++){const value=await snapshot();if(predicate(value))return value;await delay(100);}throw Error(message+': '+JSON.stringify(await snapshot()));};
  const walkTo=async x=>{
   for(let i=0;i<60;i++){const state=await snapshot(),dx=x-state.playerX-14;if(Math.abs(dx)<12){if(state.climbing)await hold('right',100);return;}
    await hold(dx>0?'right':'left',Math.max(35,Math.min(650,Math.abs(dx)/210*1000*.88)));
   }throw Error('Cannot physically walk to '+x+': '+JSON.stringify(await snapshot()));
  };
  const routeTo=async id=>{
   const scene=await evalJs("import('./world/industrial-yard.mjs').then(m=>m.SCENES[window.ICE_DEBUG.snapshot().sceneId])");
   const station=scene.interactions.find(i=>i.id===id);if(!station)throw Error('Missing physical station '+id);
   const floor=scene.platforms.reduce((a,b)=>Math.abs(a.y-station.y-32)<Math.abs(b.y-station.y-32)?a:b).y;
   for(let n=0;n<5;n++){
    const state=await snapshot(),feet=state.playerY+52;if(Math.abs(feet-floor)<.2)break;
    const up=feet>floor;
    const ladder=scene.ladders.find(l=>up?Math.abs(l.y+l.h-feet)<12:Math.abs(l.y-feet)<12);
    if(!ladder)throw Error('No physical ladder route to '+id+': '+JSON.stringify(state));
    await walkTo(ladder.x+ladder.w/2);
    const target=up?ladder.y:ladder.y+ladder.h;
    for(let j=0;j<18;j++){const current=await snapshot();if(Math.abs(current.playerY+52-target)<.2)break;await hold(up?'up':'down',350);}
    const reached=await snapshot();if(Math.abs(reached.playerY+52-target)>1)throw Error('Climb route failed '+id+': '+JSON.stringify(reached));
    await hold('right',150);
   }
   await walkTo(station.x);const state=await snapshot();
   if(Math.hypot(station.x-state.playerX-14,station.y-state.playerY-26)>112)throw Error('Station remains out of actual physical reach '+id);
  };
  const screenshot=async name=>{const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('artifacts/'+name,Buffer.from(shot.data,'base64'));};
  await tap('#reset');await tap('#tutorial-ok');
  if((await snapshot()).controls==='joystick')await tap('#controls-mode');
  // Pause must stop BOTH deadlines and cash, rather than just hiding controls.
  await tap('#menu-open');const pauseBefore=await snapshot();await delay(350);const pauseAfter=await snapshot();
  if(!pauseAfter.paused||pauseBefore.funds!==pauseAfter.funds||pauseBefore.missionTime!==pauseAfter.missionTime)throw Error('Pause menu did not freeze game clocks');
  await tap('#menu-resume');
  const results=[];
  for(const id of ['backyard','warehouse','heat-hold']){
   await tap('[data-job="'+id+'"]');let state=await snapshot();if(state.job!==id||state.stage!=='mission')throw Error('Contract did not start '+id);
   if(!state.kit?.allTools)throw Error('No free calibrated equipment preset');
   await tap('#spark');await tap('#observe');await delay(200);await tap('#inspection-close');
   if(!(await snapshot()).contract?.inspected)throw Error('Actual observation did not diagnose '+id);
   if(id==='backyard'){
    await routeTo('intake-shield');await tap('#interact');await tap('#fault-repair');
    if(!(await snapshot()).contract.repaired)throw Error('Physical intake repair did not affect contract');
    await routeTo('mainAir');await tap('#interact');const before=(await snapshot()).solver.devices.mainAir;
    const r=await bounds('#device-wheel');
    await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.w*.5,y:r.y+r.h*.8,id:1}]});await delay(50);
    await command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.w*.5,y:r.y+r.h*.72,id:1}]});await delay(50);
    await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    state=await snapshot();if(state.solver.devices.mainAir<=before+.02||!state.contract.adjusted)throw Error('Real damper drag did not change authoritative air valve');
    await screenshot('mobile-device.png');await tap('#device-close');
   }else if(id==='warehouse'){
    await routeTo('draft');await tap('#interact');
    for(let n=0;n<7;n++)await tap('#device-more');
    if((await snapshot()).solver.devices.draft>.580001)throw Error('Jammed damper bypassed its mechanical stop');
    await tap('#device-repair');if(!(await snapshot()).contract.repaired)throw Error('Physical damper repair failed');
    for(let n=0;n<6;n++)await tap('#device-more');
    if((await snapshot()).solver.devices.draft<.70)throw Error('Repaired damper did not regain travel');
    await tap('#device-close');await routeTo('site-operator');await tap('#interact');
    if(await evalJs("document.querySelector('#operator-panel').hidden"))throw Error('Physical operator panel did not open');
    await tap('#operator-assist');state=await snapshot();
    if(state.operatorConsults<1||state.story.choice!=='assisted'||Math.abs(state.solver.devices.draft-.72)>.001)throw Error('Operator did not apply local authorized assistance');
    await screenshot('mobile-warehouse.png');
   }else{
    await routeTo('mainFuel');await tap('#interact');const r=await bounds('#device-wheel'),angle=-.05*Math.PI*1.5,R=70;
    const px=a=>({x:r.x+r.w*(130+Math.cos(a)*R)/260,y:r.y+r.h*(110+Math.sin(a)*R)/220,id:1});
    await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[px(0)]});await delay(50);
    await command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[px(angle)]});await delay(50);
    await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(Math.abs((await snapshot()).solver.devices.mainFuel-.35)>.015)throw Error('Real fuel wheel rotation did not follow angular travel');
    await tap('#device-close');await routeTo('mainAir');await tap('#interact');
    // Three keyboard-equivalent detents through real touch, not direct state writes.
    for(let n=0;n<3;n++)await tap('#device-less');await tap('#device-close');
   }
   await routeTo('port');await tap('#observe');
   state=await until(s=>s.stage==='won'||s.stage==='failed','No complete outcome for '+id,140);
   if(state.stage!=='won')throw Error('Real no-purchase contract route failed '+id+': '+JSON.stringify(state));
   if(!state.contract.verified||state.objective<1)throw Error('Contract skipped its physical verification/hold');
   results.push({id,missionTime:state.missionTime,funds:state.funds,contract:state.contract});console.log('PASS PASS-TWO CONTRACT: '+id+' physical diagnosis/repair/adjust/verify/hold, payout and no purchases');await tap('#return');
  }
  if((await snapshot()).completed.length!==3)throw Error('Completed contracts did not persist');
  // Explicit storage-fault input in the disposable browser profile. Recovery
  // itself uses the actual slot UI; no live game state or solver is mutated.
  await tap('#save-menu');await tap('[data-save-slot="2"]');await tap('[data-save-slot="2"]');await tap('#save-close');
  await evalJs("localStorage.setItem('ice.save.v1.slot.2','{corrupt')");
  await tap('#save-menu');
  if(!(await evalJs("document.querySelector('#slot-2 output').textContent.includes('↶')")))throw Error('Corrupt slot did not expose backup recovery');
  await tap('[data-load-slot="2"]');
  if((await snapshot()).completed.length!==3)throw Error('Browser backup recovery lost earned progression');
  console.log('PASS PASS-TWO RECOVERY: actual slot UI restores semantic backup after injected storage corruption');
  // Portrait, landscape and foldable layouts: no inaccessible tiny controls.
  for(const [width,height] of [[844,390],[768,1024],[390,844]]){
   await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true});await delay(150);
   const layout=await evalJs("(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,world:document.querySelector('#viewport').getBoundingClientRect().height,small:Array.from(document.querySelectorAll('button')).filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44)}).map(b=>b.id||b.getAttribute('aria-label'))}))()");
   if(layout.overflow||layout.world<height*.5||layout.small.length)throw Error('Pass Two responsive layout failed '+width+'x'+height+': '+JSON.stringify(layout));
   if(width===844)await screenshot('mobile-landscape.png');
  }
  if(await evalJs('document.fullscreenEnabled')){await tap('#fullscreen');if(!(await snapshot()).fullscreen)throw Error('Fullscreen UI did not enter actual browser fullscreen');await tap('#fullscreen');if((await snapshot()).fullscreen)throw Error('Fullscreen UI did not exit');}
  // Genuine touch cancellation must neutralize the analog stick.
  if((await snapshot()).controls!=='joystick')await tap('#controls-mode');const jr=await bounds('#joystick');
  await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:jr.x+jr.w*.8,y:jr.y+jr.h*.5,id:1}]});await delay(100);
  await command('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await delay(70);const state=await snapshot();
  if(state.stickX!==0||state.stickY!==0)throw Error('Joystick stuck after actual touch cancellation');
  if(state.audio.voices>24)throw Error('Audio voice bound exceeded');
  await writeFile('artifacts/pass-two-routes.json',JSON.stringify({results,completed:state.completed,story:state.story,audio:state.audio},null,2));
  if(exceptions.length)throw Error('Pass Two browser exceptions: '+exceptions.join('; '));
  console.log('PASS PASS-TWO RELEASE: real touch repairs, lever and wheel drags, 3 no-purchase completed contracts, physical NPC assistance, pause clocks, fullscreen, cancelled joystick, portrait/landscape/foldable and bounded audio');
 }

 console.log('PASS: Android viewport, actual touch tutorial/job/ignition/observe/return, main flame particles, clock, screenshot, zero uncaught JS exceptions');
}
main().catch(e=>{console.error('FAIL browser smoke:',e.stack||e);process.exitCode=1;}).finally(async()=>{
 try{ws?.close();}catch{}
 try{browser?.kill('SIGKILL');}catch{}
 try{web.close();}catch{}
 if(profileDir)await rm(profileDir,{recursive:true,force:true}).catch(()=>{});
});


