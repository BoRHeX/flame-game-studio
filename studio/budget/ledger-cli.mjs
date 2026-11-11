// Usage: node studio/budget/ledger-cli.mjs reserve <order-path>
//     or node studio/budget/ledger-cli.mjs settle <proposal-json>
import {readFileSync} from 'node:fs';
import {reserveGithub,settleGithub,getPolicy} from './ledger.mjs';
import {validateWorkOrder} from '../orchestrator/context.mjs';
const [action,value]=process.argv.slice(2);
const repo=process.env.GITHUB_REPOSITORY,runId=process.env.GITHUB_RUN_ID;
if(!repo||!runId)throw Error('must run in GitHub Actions');
if(action==='reserve'){
 if(!/^studio\/work-orders\/[A-Za-z0-9-]+\.json$/.test(value??''))throw Error('invalid work-order path');
 const order=JSON.parse(readFileSync(value,'utf8'));
 validateWorkOrder(order);
 if(process.env.ICE_STUDIO_ENABLED!=='true')throw Error('repository variable ICE_STUDIO_ENABLED must be true');
 const policy=getPolicy();
 const cap=Math.min(order.max_cost_usd,policy.MAX_RUN_COST_USD);
 console.log(JSON.stringify(await reserveGithub({repo,runId,orderId:order.id,cap})));
}else if(action==='settle'){
 const report=JSON.parse(readFileSync(value,'utf8'));
 if(report.runId!==String(runId))throw Error('spend report run mismatch');
 if(report.billingComplete!==true)throw Error('unknown API usage: retain full reserved allowance');
 if(!Number.isFinite(report.costUsd)||report.costUsd<0)throw Error('invalid spend report');
 console.log(JSON.stringify(await settleGithub({repo,runId,actualUsd:report.costUsd})));
}else throw Error('usage: reserve <order-path> | settle <report-json>');
