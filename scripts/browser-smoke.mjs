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
       const port=Number(data.split(/\\r?\\n/)[0]);
       if(Number.isInteger(port)&&port>0)done(null,port);
     }catch{ /* Chrome has not published the port yet. */ }
   },250);
   browser.stderr.on('data',chunk=>{
     output+=String(chunk);
     const match=output.match(/DevTools listening on ws:\\/\\/127\\.0\\.0\\.1:(\\d+)\\//);
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
   if(fullscreenControl.w<30||fullscreenControl.h<30)throw Error('Fullscreen control is not thumb accessible');
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
   if(await evalJs("!document.querySelector('#tutorial').hidden"))await tap('#tutorial-ok');
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
 console.log('PASS: Android viewport, actual touch tutorial/job/ignition/observe/return, main flame particles, clock, screenshot, zero uncaught JS exceptions');
}
main().catch(e=>{console.error('FAIL browser smoke:',e.stack||e);process.exitCode=1;}).finally(async()=>{
 try{ws?.close();}catch{}
 try{browser?.kill('SIGKILL');}catch{}
 try{web.close();}catch{}
 if(profileDir)await rm(profileDir,{recursive:true,force:true}).catch(()=>{});
});

