// Durable per-repository OpenAI model budget ledger.
// Runs serially behind one GitHub Actions concurrency group. GitHub contents
// updates use blob SHA for optimistic concurrency. No provider secret here.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const load=(path)=>JSON.parse(readFileSync(join(ROOT,path),'utf8'));
const rounded=(x)=>Number(x.toFixed(6));
export function validatePolicy(p){
 for(const k of ['MAX_RUN_COST_USD','MAX_DAILY_COST_USD','INITIAL_EXPERIMENT_CAP_USD']){
  if(!Number.isFinite(p[k])||p[k]<=0)throw Error('invalid budget policy '+k);
 }
 if(p.STUDIO_ENABLED!==true||p.ENFORCEMENT_IMPLEMENTED!==true||p.DURABLE_LEDGER_ENABLED!==true)
  throw Error('paid studio disabled by policy');
}
export function reserveInMemory(book,{runId,orderId,cap,date},policy){
 validatePolicy(policy);
 if(!Number.isFinite(cap)||cap<=0||cap>policy.MAX_RUN_COST_USD)
  throw Error('requested reservation exceeds run cap');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('invalid date');
 if(book.entries.some(e=>e.runId===runId))throw Error('duplicate run reservation');
 const valued=e=>e.status==='settled'?e.actualUsd:e.reservedUsd;
 const usedDay=book.entries.filter(e=>e.date===date).reduce((n,e)=>n+valued(e),0);
 const usedAll=book.entries.reduce((n,e)=>n+valued(e),0);
 if(usedDay+cap>policy.MAX_DAILY_COST_USD+1e-8)throw Error('daily spend cap exceeded');
 if(usedAll+cap>policy.INITIAL_EXPERIMENT_CAP_USD+1e-8)throw Error('cumulative experiment cap exceeded');
 return {version:1,entries:[...book.entries,{
  runId,orderId,date,reservedUsd:rounded(cap),actualUsd:null,status:'reserved'
 }]};
}
export function settleInMemory(book,runId,actualUsd){
 if(!Number.isFinite(actualUsd)||actualUsd<0)throw Error('invalid actual USD');
 const index=book.entries.findIndex(e=>e.runId===runId);
 if(index<0)throw Error('unknown run reservation');
 const item=book.entries[index];if(item.status!=='reserved')throw Error('reservation already settled');
 if(actualUsd>item.reservedUsd+1e-7)throw Error('actual spend exceeded reserved amount; manual billing investigation');
 const entries=book.entries.map((e,i)=>i===index?{...e,status:'settled',actualUsd:rounded(actualUsd)}:e);
 return {version:1,entries};
}
const emptyLedger=()=>({version:1,entries:[]});
async function api(path,{method='GET',body,token}={}){
 const auth=token??process.env.GITHUB_TOKEN;
 if(!auth)throw Error('GITHUB_TOKEN missing');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
 const response=await fetch('https://api.github.com'+path,{
  method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+auth,
   'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined,signal:controller.signal});
 const data=await response.json();
 if(!response.ok()) {
   const err=Error('GitHub budget ledger HTTP '+response.status+': '+(data.message||''));
   err.status=response.status;throw err;
 }
 return data;
 }finally{clearTimeout(timer);}
}
async function ensureLedgerBranch(repo){
 const encoded=encodeURIComponent('ice-studio-ledger');
 try{await api('/repos/'+repo+'/git/ref/heads/'+encoded);return;}catch(e){if(e.status!==404)throw e;}
 const main=await api('/repos/'+repo+'/git/ref/heads/main');
 try{await api('/repos/'+repo+'/git/refs',{method:'POST',
   body:{ref:'refs/heads/ice-studio-ledger',sha:main.object.sha}});
 }catch(e){if(e.status!==422)throw e;}
}
async function readLedger(repo){
 const path='/repos/'+repo+'/contents/studio-spend.json?ref=ice-studio-ledger';
 try{
 const file=await api(path);
 const json=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
 if(json.version!==1||!Array.isArray(json.entries))throw Error('corrupt budget ledger');
 return {book:json,sha:file.sha};
 }catch(e){if(e.status===404)return {book:emptyLedger(),sha:null};throw e;}
}
async function writeLedger(repo,book,sha,message){
 const body={message,content:Buffer.from(JSON.stringify(book,null,2)+'\n').toString('base64'),branch:'ice-studio-ledger'};
 if(sha)body.sha=sha;
 return api('/repos/'+repo+'/contents/studio-spend.json',{method:'PUT',body});
}
export async function reserveGithub({repo,runId,orderId,cap,now=new Date()}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('invalid repository');
 const policy=load('studio/budget/policy.json');
 await ensureLedgerBranch(repo);
 const {book,sha}=await readLedger(repo);
 const next=reserveInMemory(book,{runId:String(runId),orderId,cap,date:now.toISOString().slice(0,10)},policy);
 await writeLedger(repo,next,sha,'Reserve studio budget for run '+runId);
 return {runId:String(runId),cap,usedToday:next.entries.filter(e=>e.date===now.toISOString().slice(0,10)).reduce((n,e)=>n+(e.actualUsd??e.reservedUsd),0)};
}
export async function settleGithub({repo,runId,actualUsd}){
 await ensureLedgerBranch(repo);
 const {book,sha}=await readLedger(repo);
 const next=settleInMemory(book,String(runId),actualUsd);
 await writeLedger(repo,next,sha,'Settle studio model usage for run '+runId);
 return {runId:String(runId),actualUsd};
}
export function getPolicy(){return load('studio/budget/policy.json');}
