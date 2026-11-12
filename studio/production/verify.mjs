// Runs only in a job without provider/publishing credentials. Test output is
// captured by the trusted parent; generated code cannot choose the verdict.
import {readFileSync,writeFileSync,existsSync,mkdirSync,cpSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {json,save,validateJob,validateCandidate,writeCandidate,packageHash,readWorkspace,digest,diagnosticLog} from './protocol.mjs';
const safeEnv=()=>({...Object.fromEntries(['PATH','HOME','TMPDIR','LANG','CHROME_BIN','CI'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),ICE_PRODUCTION_MODE:'true'});
function command(exe,args,cwd,timeout=360000){
 const r=spawnSync(exe,args,{cwd,env:safeEnv(),encoding:'utf8',timeout,maxBuffer:12*1024*1024});
 return {passed:r.status===0,exitCode:r.status,log:(r.stdout??'')+'\n'+(r.stderr??''),error:r.error?.message??''};
}
export function verify(jobPath,attempt,dir,{runCommand=command}={}){
 const root=process.cwd(),out=resolve(dir),job=validateJob(json(jobPath));mkdirSync(out,{recursive:true});
 const report={version:1,runId:String(process.env.GITHUB_RUN_ID),jobId:job.id,attempt,sourceSha:process.env.GITHUB_SHA,passed:false,failures:[],checks:[],screens:[]};
 const record=(name,result)=>{
  const logPath='logs/'+name+'.log';mkdirSync(join(out,'logs'),{recursive:true});writeFileSync(join(out,logPath),result.log??'');
  const summary={name,...result,log:result.passed?String(result.log??'').slice(-1200):diagnosticLog(result.log),logPath};
  report.checks.push(summary);if(!result.passed)report.failures.push(name+': '+summary.log+(result.error?'\n'+result.error:''));return result;
 };
 if(existsSync(join(out,'generation.json')))report.generation=json(join(out,'generation.json'));
 try{
  if(process.env.OPENAI_API_KEY)throw Error('Model credentials are forbidden in executable verification');
  const candidate=json(join(out,'candidate.json'));
  const expected=validateCandidate(candidate,job,process.env.GITHUB_SHA,process.env.GITHUB_RUN_ID);
  const sceneProbe="import {SCENES} from './game/world/industrial-yard.mjs';console.log(JSON.stringify(SCENES));";
  const baseline=runCommand(process.execPath,['--input-type=module','-e',sceneProbe],root,30000);
  if(!baseline.passed)throw Error('Baseline scene inspection failed');
  save(join(out,'baseline-scenes.json'),JSON.parse(baseline.log.trim()));
  writeCandidate(candidate,root);
  const sourceDigest=()=>digest(JSON.stringify([...readWorkspace(root)].map(([p,c])=>[p,digest(c)]).sort()));
  const beforeTests=sourceDigest();
  for(const [name,args] of [['unit-and-production',['test']],]){
   record(name,runCommand('npm',args,root));
  }
  const gameTests=existsSync('tests/game')?readdirSync('tests/game').filter(x=>x.endsWith('.test.mjs')).map(x=>'tests/game/'+x):[];
  if(gameTests.length)record('new-game-tests',runCommand(process.execPath,['--test',...gameTests],root));
  const acceptance=runCommand(process.execPath,['studio/production/acceptance.mjs',jobPath,join(out,'baseline-scenes.json')],root,30000);
  record('production-outcomes',acceptance);
  // Exercise the portable game without access to repository-parent assets.
  const portable=join(out,'portable');mkdirSync(portable,{recursive:true});cpSync('game',join(portable,'game'),{recursive:true});
  if(!report.failures.length){
   const browser=runCommand(process.execPath,[resolve('scripts/browser-smoke.mjs')],portable,540000);
   record('chrome-physical-touch-route',browser);
  }
  const capture=join(portable,'artifacts');mkdirSync(join(out,'screens'),{recursive:true});
  if(existsSync(capture))for(const name of readdirSync(capture)){
   if(/\.(?:png|jpg|json)$/.test(name)){cpSync(join(capture,name),join(out,'screens',name));if(/\.(png|jpg)$/.test(name))report.screens.push(name);}
  }
  const unchanged=candidate.files.every(f=>readFileSync(resolve(f.path),'utf8')===f.content);
  if(!unchanged||packageHash(candidate)!==expected||sourceDigest()!==beforeTests)throw Error('Product source changed during its verification');
  report.packageHash=expected;report.passed=report.failures.length===0;
  if(report.passed){mkdirSync(join(out,'site'),{recursive:true});cpSync('game',join(out,'site'),{recursive:true});}
 }catch(e){report.failures.push(String(e.stack??e).slice(0,16000));}
 save(join(out,'verification.json'),report);console.log(JSON.stringify({attempt,passed:report.passed,failures:report.failures.map(x=>x.slice(0,300))}));
 return report;
}
if(process.argv[1]?.endsWith('/verify.mjs'))verify(process.argv[2],Number(process.argv[3]),process.argv[4]);
