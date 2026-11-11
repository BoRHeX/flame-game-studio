// V1: deterministic local work-order validation and scoped canonical memory.
// No API key, no LLM invocation, no repo writes.
import {readFileSync,existsSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const DEFAULT_ROOT=fileURLToPath(new URL('../../',import.meta.url));
const readJson=(path,rootDir=DEFAULT_ROOT)=>JSON.parse(readFileSync(join(rootDir,path),'utf8'));
export function normalizePath(path){
 if(typeof path!=='string'||!path.trim()||path.startsWith('/')||path.includes('\\'))throw Error('invalid scoped path');
 const normalized=path.endsWith('/')?path.slice(0,-1):path;
 if(normalized.split('/').some(p=>p==='..'||p==='.'||p===''))throw Error('invalid scoped path');
 return path;
}
export function validateWorkOrder(order,rootDir=DEFAULT_ROOT){
 const schema=readJson('studio/contracts/work-order.schema.json',rootDir);
 if(!order||typeof order!=='object'||Array.isArray(order))throw Error('invalid work order');
 for(const key of schema.required)if(!(key in order))throw Error('missing '+key);
 for(const key of Object.keys(order))if(!(key in schema.properties))throw Error('unexpected '+key);
 if(!Array.isArray(order.allowed_paths)||!order.allowed_paths.length||!Array.isArray(order.acceptance)||!order.acceptance.length)throw Error('empty task scope');
 const roles=readJson('studio/agents/roles.json',rootDir).roles;
 const role=roles.find(x=>x.id===order.role);
 if(!role)throw Error('unknown agent role');
 if(!Number.isFinite(order.max_cost_usd)||order.max_cost_usd<0)throw Error('invalid cost allowance');
 if(order.verification_script!==undefined){
  if(typeof order.verification_script!=='string'||
     !/^studio\/acceptance\/[a-z0-9-]+\.mjs$/.test(order.verification_script))
   throw Error('invalid trusted acceptance script');
  const script=join(rootDir,order.verification_script);
  if(!existsSync(script)||!lstatSync(script).isFile())throw Error('missing trusted acceptance script');
 }
 if(order.target_file!==undefined){
  normalizePath(order.target_file);
  if(order.target_file.endsWith('/'))throw Error('target file must be a file');
  if(!order.allowed_paths.some(p=>order.target_file.startsWith(p)))throw Error('target file outside allowed scope');
  if(!role.scope.some(p=>order.target_file.startsWith(p)))throw Error('target file outside role ownership');
 }
 for(const p of order.allowed_paths){
   normalizePath(p);
   if(!role.scope.some(allowed=>p===allowed||p.startsWith(allowed)))throw Error('scope outside role ownership: '+p);
   if(p.startsWith('.github/')||p.startsWith('studio/budget/')||p.startsWith('memory/canonical/'))throw Error('protected path');
 }
 return {order,role};
}
export function compileBrief(order,rootDir=DEFAULT_ROOT){
 const {role}=validateWorkOrder(order,rootDir);
 const canon=readJson('memory/canonical/vision.json',rootDir);
 const eventCatalog=readJson('studio/contracts/event-catalog.json',rootDir);
 const policy=readJson('studio/budget/policy.json',rootDir);
 return {id:order.id,role:role.id,goal:order.goal,canon,events:eventCatalog,
   allowed_paths:order.allowed_paths,acceptance:order.acceptance,
   max_cost_usd:Math.min(order.max_cost_usd,policy.MAX_RUN_COST_USD),
   max_attempts:Math.min(order.max_attempts??1,policy.MAX_ATTEMPTS_PER_TASK),
   status:'DRY_RUN_ONLY',agent_invocation_enabled:false};
}

