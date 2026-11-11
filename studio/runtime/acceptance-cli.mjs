// Runs only in the unprivileged verification checkout, after candidate application.
// Acceptance scripts are trusted repository files; specialist outputs cannot edit them.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadOrder} from './proposal.mjs';
import {validateWorkOrder} from '../orchestrator/context.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function runAcceptance(orderPath,{spawnImpl=spawnSync}={}){
 if(!/^studio\/work-orders\/[a-zA-Z0-9-]+\.json$/.test(orderPath??''))throw Error('invalid work order selector');
 if(process.env.OPENAI_API_KEY)throw Error('acceptance runner must not receive model credentials');
 const order=loadOrder(orderPath);
 validateWorkOrder(order);
 if(!order.verification_script){console.log('No additional work-order acceptance script: '+order.id);return;}
 const result=spawnImpl(process.execPath,[order.verification_script],
  {cwd:ROOT,stdio:'inherit',shell:false,timeout:30000});
 if(result.error||result.status!==0)throw Error('work-order acceptance failed: '+order.id);
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)runAcceptance(process.argv[2]);
