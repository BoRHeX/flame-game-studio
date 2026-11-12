// Trusted production-job protocol. Departments share a product workspace;
// publishing credentials, budgets and the verifier remain outside that workspace.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,lstatSync} from 'node:fs';
import {resolve,dirname,join,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
export const PRODUCT_ROOTS=['game/','content/','assets/visual/','assets/audio/','design/audio/','design/art/','tests/game/'];
export const MAX_ATTEMPTS=6;
const TEXT=/\.(?:mjs|js|ts|json|html|css|svg|md|txt)$/;
export const digest=content=>createHash('sha256').update(content).digest('hex');
// Preserve the actual failing assertion before trimming verbose passing output
// or large object diffs. Complete logs remain separate workflow artifacts.
export function diagnosticLog(log,limit=6000){
 const lines=String(log??'').split('\n'),starts=[];
 for(let i=0;i<lines.length;i++)if(/^\s*not ok \d+/.test(lines[i]))starts.push(i);
 if(starts.length){
  const each=Math.max(500,Math.floor(limit/Math.min(starts.length,8)));
  return starts.slice(0,8).map(start=>{
   let end=start+1;while(end<lines.length&&!/^\s*\.\.\.\s*$/.test(lines[end])&&!/^\s*(?:not )?ok \d+/.test(lines[end]))end++;
   const block=lines.slice(start,end),important=[];
   for(let i=0;i<block.length;i++)if(/\b(?:location|failureType|error|code|name|operator|stack):/.test(block[i]))important.push(...block.slice(i,i+(/\b(?:error|stack):/.test(block[i])?8:1)));
   return (block[0]+'\n'+[...new Set(important)].join('\n')+'\n'+block.slice(1).join('\n').slice(0,Math.floor(each/2))).slice(0,each);
  }).join('\n\n').slice(0,limit);
 }
 const marker=lines.findIndex(l=>/failing tests:/.test(l));
 if(marker>=0)return lines.slice(marker+1).join('\n').slice(0,limit);
 const errors=[];for(let i=0;i<lines.length;i++)if(/(?:Error:|AssertionError|^FAIL\b|^\s*✖)/.test(lines[i]))errors.push(lines.slice(i,i+12).join('\n'));
 return (errors.length?errors.slice(0,6).join('\n\n'):lines.slice(-35).join('\n')).slice(0,limit);
}
export function repairFeedback(report){
 if(!report)return null;
 const v=report.verification??{};
 return {attempt:report.attempt,passed:report.passed,error:report.error,verdict:report.verdict,
  verification:{passed:v.passed,generation:v.generation,
   checks:(v.checks??[]).map(c=>({name:c.name,passed:c.passed,error:c.error,log:c.passed?undefined:diagnosticLog(c.log,4000)})),
   failures:(v.failures??[]).map(f=>diagnosticLog(f,4000))}};
}
export const json=path=>JSON.parse(readFileSync(path,'utf8'));
export function save(path,value){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');}
export function output(key,value){if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,key+'='+String(value).replace(/[\r\n]/g,' ')+'\n',{flag:'a'});}
export function productPath(path){
 if(typeof path!=='string'||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('.'))||
  !PRODUCT_ROOTS.some(root=>path.startsWith(root))||!TEXT.test(path))throw Error('Not a product text path: '+String(path));
 return path;
}
export function validateJob(job){
 if(job?.version!==1||!/^ICE-[A-Z0-9-]{3,70}$/.test(job.id??'')||typeof job.goal!=='string'||job.goal.length<30||
  !Array.isArray(job.acceptance)||!job.acceptance.length||!job.acceptance.every(s=>typeof s==='string')||
  !Number.isFinite(job.max_cost_usd)||job.max_cost_usd<=0||job.max_cost_usd>2||
  !Number.isInteger(job.max_attempts)||job.max_attempts<1||job.max_attempts>MAX_ATTEMPTS)
  throw Error('Invalid bounded production job');
 for(const p of job.references??[])if(!/^assets\/reference\/[a-zA-Z0-9-]+\.jpg$/.test(p))throw Error('Invalid reference image path');
 if(job.seed&&(!/^\d+$/.test(job.seed.run_id??'')||!/^production-[0-5]$/.test(job.seed.artifact??'')))throw Error('Invalid production continuation');
 return job;
}
export function selectJob(diff,read){
 const lines=diff.trim().split('\n').filter(Boolean);
 if(lines.length!==1||!/^A\tstudio\/production\/requests\/[a-zA-Z0-9-]+\.json$/.test(lines[0]))throw Error('One newly added production request is required');
 const request=jsonText(read(lines[0].split('\t')[1]));
 if(Object.keys(request).sort().join(',')!=='job,version'||request.version!==1||
  !/^studio\/production\/jobs\/[a-zA-Z0-9-]+\.json$/.test(request.job??''))throw Error('Invalid production request');
 validateJob(jsonText(read(request.job)));return request.job;
}
const jsonText=t=>JSON.parse(t);
export function readWorkspace(root=process.cwd()){
 const files=new Map();
 for(const start of PRODUCT_ROOTS){
  const pending=[join(root,start)];
  while(pending.length){const path=pending.shift();if(!existsSync(path))continue;const stat=lstatSync(path);
   if(stat.isSymbolicLink())throw Error('Symlinks are not production inputs');
   if(stat.isDirectory()){for(const name of readdirSync(path).sort())if(!name.startsWith('.'))pending.push(join(path,name));}
   else if(TEXT.test(path)&&stat.size<=500000)files.set(relative(root,path).split(sep).join('/'),readFileSync(path,'utf8'));
  }
 }
 return files;
}
export function applyEdits(files,edits){
 if(!Array.isArray(edits)||!edits.length||edits.length>48)throw Error('Invalid product edit batch');
 const next=new Map(files);
 for(const e of edits){productPath(e.path);
  if(!['write','replace'].includes(e.operation)||typeof e.content!=='string'||typeof e.find!=='string'||e.content.length>500000)throw Error('Invalid file operation');
  if(e.operation==='write'){if(e.find)throw Error('Complete writes have no search anchor');next.set(e.path,e.content);}
  else {const old=next.get(e.path);if(!e.find||typeof old!=='string')throw Error('Missing edit source '+e.path);
   const at=old.indexOf(e.find);if(at<0||old.indexOf(e.find,at+1)>=0)throw Error('Replace anchor must match exactly once: '+e.path);
   next.set(e.path,old.slice(0,at)+e.content+old.slice(at+e.find.length));}
 }
 return next;
}
export function changedFiles(baseline,current){
 return [...current].filter(([path,content])=>baseline.get(path)!==content).map(([path,content])=>({path,content}));
}
export function validateCandidate(candidate,job,sourceSha,runId){
 validateJob(job);
 if(candidate.version!==1||candidate.jobId!==job.id||candidate.sourceSha!==sourceSha||candidate.runId!==String(runId)||
  !Number.isInteger(candidate.attempt)||candidate.attempt<0||candidate.attempt>=job.max_attempts)throw Error('Candidate identity mismatch');
 if(!Array.isArray(candidate.files)||!candidate.files.length||candidate.files.length>80)throw Error('Empty or excessive production package');
 const seen=new Set();let bytes=0;
 for(const f of candidate.files){productPath(f.path);if(seen.has(f.path)||typeof f.content!=='string'||!f.content.trim())throw Error('Duplicate or empty production file');
  seen.add(f.path);bytes+=Buffer.byteLength(f.content);if(Buffer.byteLength(f.content)>500000)throw Error('File exceeds transport size');}
 if(bytes>2_000_000)throw Error('Production package exceeds transport size');
 return packageHash(candidate);
}
export function packageHash(candidate){return digest(JSON.stringify(candidate.files.map(({path,content})=>({path,sha256:digest(content)})).sort((a,b)=>a.path.localeCompare(b.path))));}
export function writeCandidate(candidate,root=process.cwd()){
 for(const f of candidate.files){const target=resolve(root,productPath(f.path));
  if(!target.startsWith(resolve(root)+sep))throw Error('Product path escaped checkout');
  let p=target;while(p.startsWith(resolve(root)+sep)){if(existsSync(p)&&lstatSync(p).isSymbolicLink())throw Error('Symlink output blocked');p=dirname(p);}
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,f.content);}
}
export function contextFiles(files,role,limit=125000,changedPaths=[]){
 const priorities=['game/world/','game/animation/','game/player/','game/index.html','game/style.css','game/main.mjs'];
 const byRole={integrator:['game/main.mjs','game/player/','game/index.html','game/style.css'],gameplay_engineer:['game/player/','game/main.mjs','game/world/'],ux_designer:['game/index.html','game/style.css','game/main.mjs'],character_animator:['game/animation/','game/world/'],sound_engineer:['game/audio/','game/animation/']};
 const preferred=byRole[role]??priorities;
 const rank=p=>{const changed=changedPaths.indexOf(p);if(changed>=0)return -1000+changed;const at=preferred.findIndex(x=>p.startsWith(x));return at<0?100:at;};
 const sorted=[...files].sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0]));
 const result=[];let size=0;
 for(const [path,content] of sorted){if(size+content.length<=limit){result.push({path,content});size+=content.length;}}
 return {files:result,index:[...files].map(([path,content])=>({path,bytes:Buffer.byteLength(content),sha256:digest(content)}))};
}
export function pickAttempt(dirs,runId){
 const reports=[];
 for(const dir of dirs){const path=join(dir,'assessment.json');if(existsSync(path)){const r=json(path);if(r.runId===String(runId))reports.push({dir,report:r});}}
 return reports.filter(x=>x.report.passed===true).sort((a,b)=>b.report.attempt-a.report.attempt)[0]??null;
}
