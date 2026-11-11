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
 const debugPort=await new Promise((resolvePort,reject)=>{
   let output='';
   const timeout=setTimeout(()=>reject(Error('Chrome DevTools did not start: '+output.slice(-400))),16000);
   browser.stderr.on('data',chunk=>{
     output+=String(chunk);
     const match=output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
     if(match){clearTimeout(timeout);resolvePort(Number(match[1]));}
   });
   browser.on('exit',code=>{clearTimeout(timeout);reject(Error('Chrome exited '+code+' '+output.slice(-450)));});
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
