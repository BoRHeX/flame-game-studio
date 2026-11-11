// Build a small scoped task briefing from canonical memory and owned source modules.
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileBrief} from '../orchestrator/context.mjs';
import {loadOrder} from './proposal.mjs';
export const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const readText=(p)=>readFileSync(join(ROOT,p),'utf8');
function ownedFiles(paths,maxFiles=7,maxChars=35000){
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
       if(body.length>12000)continue; // never silently truncate live source modules
       if(body.length<=remaining){found.push({path:relative(ROOT,current).replace(/\\/g,'/'),body});remaining-=body.length;}
     }
   }
 }
 return found;
}
export function buildBrief(orderPath){
 const order=loadOrder(orderPath);
 const roleBrief=compileBrief(order);
 const canon=readText('design/game-bible.md');
 const vision=readText('design/visual-bible.md');
 const systems=readText('design/product-systems.md');
 const memory=readText('memory/README.md');
 const files=ownedFiles(order.allowed_paths);
 return {
  order,roleBrief,canon:canon.slice(0,13000),visualBrief:vision.slice(0,14000),
  systemsBrief:systems.slice(0,12000),memoryPolicy:memory.slice(0,3600),
  files,sourceSha:process.env.GITHUB_SHA??'uncommitted',
  instruction:'Historical images not in source tree are NOT available to agent as image data. Do not claim to have seen or imported them.'
 };
}
