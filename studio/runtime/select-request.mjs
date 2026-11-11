// One-time authorized GitHub commit request -> canonical bounded work order.
// No secrets, no network calls, no model execution. Emits only a GitHub output line.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateWorkOrder} from '../orchestrator/context.mjs';

const REQUEST_PATH=/^studio\/requests\/[a-zA-Z0-9-]+\.json$/;
const ORDER_PATH=/^studio\/work-orders\/[a-zA-Z0-9-]+\.json$/;

export function selectFromDiff(diff,readRequest){
 if(typeof diff!=='string')throw Error('invalid commit diff');
 const changed=diff.trim().split('\n').filter(Boolean);
 if(changed.length!==1)throw Error('studio run must be one new request file in a dedicated commit');
 const match=/^A\t(.+)$/.exec(changed[0]);
 if(!match)throw Error('studio request must be added, not modified or deleted');
 const path=match[1];
 if(!REQUEST_PATH.test(path))throw Error('unexpected request path');
 const request=JSON.parse(readRequest(path));
 if(!request||Array.isArray(request)||typeof request!=='object')throw Error('invalid request payload');
 if(Object.keys(request).sort().join(',')!=='order,version'||request.version!==1)
  throw Error('unknown request fields or version');
 if(typeof request.order!=='string'||!ORDER_PATH.test(request.order))
  throw Error('invalid work order path');
 return request.order;
}

export function selectOrder({event,manualOrder,diff,readRequest}){
 let order;
 if(event==='push')order=selectFromDiff(diff,readRequest);
 else if(event==='workflow_dispatch')order=manualOrder;
 else throw Error('untrusted execution event');
 if(!ORDER_PATH.test(order??''))throw Error('invalid selected work order');
 return order;
}
if(process.argv[1] && new URL('file://'+process.argv[1]).href===import.meta.url){
 const event=process.env.GITHUB_EVENT_NAME;
 const changed=event==='push'
  ?execFileSync('git',['diff-tree','--no-commit-id','--name-status','-r','HEAD'],{encoding:'utf8',timeout:10000})
  :'';
 const order=selectOrder({event,manualOrder:process.env.MANUAL_ORDER,
  diff:changed,readRequest:path=>readFileSync(path,'utf8')});
 const spec=JSON.parse(readFileSync(order,'utf8'));
 validateWorkOrder(spec);
 console.log('order='+order);
}
