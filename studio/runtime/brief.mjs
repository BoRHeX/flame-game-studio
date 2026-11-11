// Build a small scoped task briefing from canonical memory and owned source modules.
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileBrief} from '../orchestrator/context.mjs';
import {loadOrder} from './proposal.mjs';
import {loadProfile} from '../orchestrator/roster.mjs';
export const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const readText=(p)=>readFileSync(join(ROOT,p),'utf8');
function ownedFiles(paths,maxFiles=10,maxChars=90000){
 let remaining=maxChars;
 const found=[];
 for(const path of paths){
   const absolute=join(ROOT,path);
   if(!existsSync(absolute))continue;
   const pending=[absolute];
   while(pending.length&&found.length<maxFiles&&remaining>0){
     const current=pending.shift(),s=statSync(current);
     if(s.isDirectory()){
       for(const name of readdirSync(current).sort())if(!name.startsWith('.'))pending.push(join(current,name));
     }else if(s.isFile()&&/\.(?:mjs|ts|js|json|md|css|html|svg|yaml|yml)$/.test(current)){
       const body=readFileSync(current,'utf8');
       if(Buffer.byteLength(body)>85000)continue; // matches the accepted proposal file ceiling
       if(body.length<=remaining){found.push({path:relative(ROOT,current).replace(/\\/g,'/'),body});remaining-=body.length;}
     }
   }
 }
 return found;
}
export function buildBrief(orderPath,{executionMode='dry_run'}={}){
 if(!['dry_run','paid_proposal'].includes(executionMode))throw Error('invalid briefing execution mode');
 const order=loadOrder(orderPath);
 const roleBrief=compileBrief(order);
 // Compilation is always inert. Only the guarded runtime selects paid proposal
 // context after activation checks; these fields never grant execution rights.
 if(executionMode==='paid_proposal'){
  roleBrief.status='PAID_PROPOSAL';
  roleBrief.agent_invocation_enabled=true;
 }
 const agentProfile=loadProfile(order.role);
 const producerProfile=loadProfile('producer');
 const qaProfile=loadProfile('qa_architect');
 const canon=readText('design/game-bible.md');
 const vision=readText('design/visual-bible.md');
 const systems=readText('design/product-systems.md');
 const memory=readText('memory/README.md');
 const files=ownedFiles(order.allowed_paths);
 // Read-only dependencies are context, never writable agent permissions.
 const dependencyPaths=[...new Set([
  ...agentProfile.critical_inputs,
  ...(order.required_contracts??[]),
  ...(order.verification_script?[order.verification_script]:[]),
  ...(order.target_file?[order.target_file]:[])
 ])].filter(p=>/^(?:game|content|design|tests|scripts|studio|memory|assets)\/[a-zA-Z0-9_./-]+$/.test(p)&&!p.includes('..'));
 const readOnlyDependencies=dependencyPaths.filter(p=>existsSync(join(ROOT,p)))
  .filter(p=>statSync(join(ROOT,p)).isFile())
  .slice(0,24)
  .map(path=>({path,body:readText(path)}));
 const incidentPath='memory/incidents/'+order.id+'.md';
 const incidentNotes=existsSync(join(ROOT,incidentPath))?readText(incidentPath).slice(0,4500):'';
 const activeDecisions=ownedFiles(['memory/decisions/'],10,24000)
  .filter(file=>/^Status:\s*ACCEPTED\s*$/mi.test(file.body));
 return {
  order,roleBrief,agentProfile,producerProfile,qaProfile,canon:canon.slice(0,13000),visualBrief:vision.slice(0,14000),
  systemsBrief:systems.slice(0,12000),memoryPolicy:memory.slice(0,3600),
  files,readOnlyDependencies,activeDecisions,incidentNotes,sourceSha:process.env.GITHUB_SHA??'uncommitted',
  execution:{mode:executionMode,proposal_generation_authorized:executionMode==='paid_proposal',
   generated_code_execution_authorized:false,automatic_merge_authorized:false},
  instruction:'The active work order defines this run\'s deliverable and acceptance; role success definitions describe longer-term department goals. Active decisions supersede historical activation notes. Paid proposal mode authorizes generating scoped file content only; CI executes it later without secrets. Historical images not in source tree are unavailable as image data; do not claim to have seen or imported them.'
 };
}

