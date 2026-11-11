// GitHub Actions queue selector: a one-shot request is committed on main.
// No key, model token or external write permission is required by this module.
import {readFileSync,appendFileSync} from 'node:fs';
import {validateWorkOrder} from './context.mjs';
const ORDER=/^studio\/work-orders\/[a-z0-9-]+\.json$/;
const REQUEST_ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{7,79}$/;
export function selectProductionRequest({eventName,manualOrder,queuedRequest}){
 let path,requestId;
 if(eventName==='push'){
  const q=queuedRequest;
  if(!q||typeof q!=='object'||Array.isArray(q))throw Error('push requires a queued request');
  if(!REQUEST_ID.test(q.requestId??''))throw Error('invalid queue request ID');
  if(Object.keys(q).some(k=>!['requestId','order','note'].includes(k)))throw Error('unknown request field');
  path=q.order;
  requestId=q.requestId;
 }else if(eventName==='workflow_dispatch'){
  path=manualOrder;
  requestId='manual-workflow';
 }else throw Error('disallowed trigger event');
 if(typeof path!=='string'||!ORDER.test(path))throw Error('invalid work-order path');
 const order=JSON.parse(readFileSync(path,'utf8'));
 validateWorkOrder(order);
 return {orderPath:path,requestId,role:order.role,id:order.id};
}
function cli(){
 const eventName=process.env.GITHUB_EVENT_NAME;
 const queuedRequest=eventName==='push'?JSON.parse(readFileSync('studio/requests/next.json','utf8')):null;
 const result=selectProductionRequest({eventName,manualOrder:process.env.MANUAL_ORDER,queuedRequest});
 const output=process.env.GITHUB_OUTPUT;
 if(!output)throw Error('GITHUB_OUTPUT unavailable');
 appendFileSync(output,'order_path='+result.orderPath+'\n');
 console.log('Selected I.C.E. work order:',result.id,'role:',result.role,'request:',result.requestId);
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)cli();
