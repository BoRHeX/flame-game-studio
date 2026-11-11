// Untrusted model output validator; never execute candidate code in a secret-bearing job.
import {readFileSync,writeFileSync,mkdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,dirname,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateWorkOrder,normalizePath} from '../orchestrator/context.mjs';
const PROJECT_ROOT=fileURLToPath(new URL('../../',import.meta.url));
const WRITABLE=['game/','content/','design/art/','design/audio/','assets/visual/','assets/audio/'];
const TEXT_EXT=new Set(['.mjs','.js','.ts','.json','.html','.css','.svg','.md','.txt','.yaml','.yml']);
const suffix=(p)=>p.slice(p.lastIndexOf('.'));
export function validateChange(change,order,root=PROJECT_ROOT){
 if(!change||typeof change!=='object'||Array.isArray(change))throw Error('invalid change');
 if(Object.keys(change).sort().join(',')!=='content,path')throw Error('change must contain only path and content');
 const path=normalizePath(change.path);
 if(!WRITABLE.some(p=>path.startsWith(p)))throw Error('protected output category '+path);
 if(!order.allowed_paths.some(p=>path.startsWith(p)))throw Error('file outside work-order allowance '+path);
 if(!TEXT_EXT.has(suffix(path)))throw Error('only approved text assets allowed '+path);
 if(path.split('/').some(x=>x.startsWith('.')))throw Error('hidden files forbidden');
 if(typeof change.content!=='string'||!change.content.trim()||Buffer.byteLength(change.content)>85000)
  throw Error('empty or oversize candidate '+path);
 const target=resolve(root,path);
 if(!target.startsWith(resolve(root)+sep))throw Error('path escapes repository');
 let current=dirname(target);
 while(current.startsWith(resolve(root)+sep)){
   if(existsSync(current)&&lstatSync(current).isSymbolicLink())throw Error('symbolic parent blocked '+path);
   current=dirname(current);
 }
 if(existsSync(target)&&lstatSync(target).isSymbolicLink())throw Error('symbolic candidate blocked '+path);
 return {path,bytes:Buffer.byteLength(change.content),sha256:createHash('sha256').update(change.content).digest('hex')};
}
export function validateProposal(proposal,order,root=PROJECT_ROOT){
 validateWorkOrder(order,root);
 if(!proposal||typeof proposal!=='object')throw Error('invalid proposal');
 if(proposal.orderId!==order.id)throw Error('work order mismatch');
 if(typeof proposal.runId!=='string'||!/^\d+$/.test(proposal.runId))throw Error('invalid run id');
 if(!Array.isArray(proposal.changes)||proposal.changes.length<1||proposal.changes.length>4)
  throw Error('limit proposal to four files');
 if(order.target_file&&(proposal.changes.length!==1||proposal.changes[0]?.path!==order.target_file))
  throw Error('proposal must change only target file: '+order.target_file);
 const names=new Set();
 const manifest=proposal.changes.map(c=>{
   const validated=validateChange(c,order,root);
   if(names.has(validated.path))throw Error('duplicate candidate path');
   names.add(validated.path);return validated;
 });
 if(manifest.reduce((s,m)=>s+m.bytes,0)>180000)throw Error('candidate payload too large');
 return manifest;
}
export function applyProposal(proposal,order,root=PROJECT_ROOT){
 const manifest=validateProposal(proposal,order,root);
 for(const c of proposal.changes){
   const target=resolve(root,c.path);
   mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,c.content,'utf8');
 }
 return manifest;
}
export function loadOrder(path){return JSON.parse(readFileSync(path,'utf8'));}
export function loadProposal(path){return JSON.parse(readFileSync(path,'utf8'));}
