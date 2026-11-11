// Apply generated files only in an isolated unprivileged QA checkout.
import {loadOrder,loadProposal,applyProposal} from './proposal.mjs';
const [orderPath,proposalPath]=process.argv.slice(2);
if(!/^studio\/work-orders\/[a-zA-Z0-9-]+\.json$/.test(orderPath??''))throw Error('invalid work order selector');
const order=loadOrder(orderPath),proposal=loadProposal(proposalPath);
if(proposal.sourceSha!==process.env.GITHUB_SHA)throw Error('proposal source commit mismatch');
const changed=applyProposal(proposal,order);
console.log(JSON.stringify({orderId:order.id,changed:changed.map(x=>({path:x.path,sha256:x.sha256}))}));
