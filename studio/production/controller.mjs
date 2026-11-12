// Trusted orchestrator/publisher. Never imports or executes candidate modules.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,cpSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {json,save,output,validateJob,selectJob,validateCandidate,packageHash,pickAttempt} from './protocol.mjs';
import {reserveGithub,settleGithub,getPolicy} from '../budget/ledger.mjs';
export async function github(path,{method='GET',body,fetchImpl=fetch}={}){
 const r=await fetchImpl('https://api.github.com'+path,{method,headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok)throw Error('GitHub '+r.status+': '+d.message);return d;
}
export async function publishVerified({job,candidate,assessment,repo,runId,sourceSha,api=github}){
 if(process.env.OPENAI_API_KEY)throw Error('Model key must not reach the publisher');
 validateCandidate(candidate,job,sourceSha,runId);
 if(assessment.passed!==true||assessment.verification?.passed!==true||assessment.verdict?.approved!==true||
  assessment.verdict?.visible_progress!==true||assessment.runId!==String(runId)||assessment.jobId!==job.id||assessment.sourceSha!==sourceSha||
  assessment.attempt!==candidate.attempt||assessment.packageHash!==packageHash(candidate)||assessment.verification.packageHash!==packageHash(candidate))throw Error('Verified production attestation is missing or mismatched');
 const prefix='/repos/'+repo,head=await api(prefix+'/git/ref/heads/main');
 if(head.object.sha!==sourceSha)throw Error('STALE_BASE: main changed during production; no overwrite or untested automatic merge');
 const source=await api(prefix+'/git/commits/'+sourceSha);
 const tree=await api(prefix+'/git/trees',{method:'POST',body:{base_tree:source.tree.sha,tree:[
  ...candidate.files.map(f=>({path:f.path,mode:'100644',type:'blob',content:f.content})),
  {path:'studio/production/history/'+runId+'.json',mode:'100644',type:'blob',content:JSON.stringify({jobId:job.id,runId,sourceSha,attempt:candidate.attempt,packageHash:assessment.packageHash,handoffs:candidate.handoffs,verdict:assessment.verdict,verification:assessment.verification.checks.map(c=>({name:c.name,passed:c.passed})),publishedBy:'trusted-production-publisher'},null,2)+'\n'}]}});
 const commit=await api(prefix+'/git/commits',{method:'POST',body:{message:'I.C.E. '+job.id+': verified autonomous production build',tree:tree.sha,parents:[sourceSha]}});
 const branch='production/'+job.id.toLowerCase()+'-'+runId;
 await api(prefix+'/git/refs',{method:'POST',body:{ref:'refs/heads/'+branch,sha:commit.sha}});
 const pr=await api(prefix+'/pulls',{method:'POST',body:{title:job.title??job.id,head:branch,base:'main',body:'One autonomous production job: producer-selected team, coordinated product edits, executable feedback, visual review and verified preview promotion.\n\n'+candidate.handoffs.map(x=>'- '+x.role+': '+x.summary).join('\n')+'\n\nVerification: '+assessment.verification.checks.filter(c=>c.passed).map(c=>c.name).join(', ')+'.\n\nVisual verdict: '+assessment.verdict.findings.join('; ')+'.\n\nRun '+runId+'; final attempt '+candidate.attempt+'. Phone creative acceptance remains a player observation.'}});
 // GitHub refuses the merge if its head moved; the shared production concurrency
 // prevents other automated studio jobs from mutating this base while publishing.
 const still=await api(prefix+'/git/ref/heads/main');if(still.object.sha!==sourceSha)throw Error('STALE_BASE: main changed before preview promotion');
 // Fast-forward is an atomic graph check. A concurrent main commit makes this
 // update non-fast-forward and GitHub refuses it instead of merging untested code.
 await api(prefix+'/git/refs/heads/main',{method:'PATCH',body:{sha:commit.sha,force:false}});
 return {pr:pr.number,url:pr.html_url,commitSha:commit.sha,mergeSha:commit.sha};
}
async function main(){
 const [action,...args]=process.argv.slice(2),repo=process.env.GITHUB_REPOSITORY,runId=String(process.env.GITHUB_RUN_ID);
 if(action==='prepare'){
  const path=selectJob(execFileSync('git',['diff-tree','--no-commit-id','--name-status','-r','HEAD'],{encoding:'utf8'}),p=>readFileSync(p,'utf8'));
  const job=validateJob(json(path));output('job',path);output('attempts',job.max_attempts);console.log('PRODUCTION JOB '+job.id);
 }else if(action==='reserve'){
  if(process.env.ICE_STUDIO_ENABLED!=='true')throw Error('Studio is not enabled');
  const job=validateJob(json(args[0])),policy=getPolicy();
  console.log(JSON.stringify(await reserveGithub({repo,runId,orderId:job.id,cap:Math.min(job.max_cost_usd,policy.MAX_RUN_COST_USD)})));
 }else if(action==='settle'){
  const reports=[];for(const dir of readdirSync(args[0])){const p=join(args[0],dir,'spend.json');if(existsSync(p))reports.push(json(p));}
  reports.sort((a,b)=>b.attempt-a.attempt||b.modelAudit.length-a.modelAudit.length);
  const report=reports[0];if(!report||report.runId!==runId||!report.billingComplete)throw Error('Unknown model billing; reservation retained');
  console.log(JSON.stringify(await settleGithub({repo,runId,actualUsd:report.costUsd})));
 }else if(action==='publish'){
  const job=validateJob(json(args[0])),parent=args[1],dirs=readdirSync(parent).map(x=>join(parent,x));
  const chosen=pickAttempt(dirs,runId);if(!chosen)throw Error('No attempt passed executable and visual acceptance');
  const candidate=json(join(chosen.dir,'candidate.json'));
  const result=await publishVerified({job,candidate,assessment:chosen.report,repo,runId,sourceSha:process.env.GITHUB_SHA});
  mkdirSync('artifacts/release',{recursive:true});cpSync(join(chosen.dir,'site'),'artifacts/release/site',{recursive:true});
  save('artifacts/release/production-summary.json',{...result,jobId:job.id,runId,attempt:candidate.attempt,packageHash:packageHash(candidate)});
  output('sha',result.mergeSha);output('pr',result.pr);console.log(JSON.stringify(result));
 }else throw Error('Unknown production controller action');
}
if(process.argv[1]?.endsWith('/controller.mjs'))await main();
