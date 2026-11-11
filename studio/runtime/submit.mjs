// Privileged job: reviewed text-only candidate -> isolated branch -> draft PR.
// NEVER execute generated source code here. Use argument arrays, not shell.
import {spawnSync} from 'node:child_process';
import {loadOrder,loadProposal,applyProposal} from './proposal.mjs';
const [orderPath,proposalPath]=process.argv.slice(2);
if(!/^studio\/work-orders\/[a-zA-Z0-9-]+\.json$/.test(orderPath??''))throw Error('invalid work-order selector');
if(!process.env.GITHUB_TOKEN)throw Error('GitHub PR token missing');
const order=loadOrder(orderPath),proposal=loadProposal(proposalPath);
if(proposal.sourceSha!==process.env.GITHUB_SHA)throw Error('branch-base mismatch');
const runId=String(process.env.GITHUB_RUN_ID);
if(!/^\d+$/.test(runId)||proposal.runId!==runId)throw Error('run-id mismatch');
const branch='ice-agent/'+order.id.toLowerCase()+'-'+runId;
function command(exe,args){
 const r=spawnSync(exe,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
 if(r.status!==0)throw Error(exe+' '+args[0]+' failed: '+(r.stderr||'').slice(-700));
 return (r.stdout||'').trim();
}
command('git',['config','user.name','ice-production-studio']);
command('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
command('git',['checkout','-b',branch]);
const manifest=applyProposal(proposal,order);
command('git',['add','--',...manifest.map(x=>x.path)]);
if(!command('git',['status','--porcelain']))throw Error('agent produced no changes');
command('git',['commit','-m','I.C.E. '+order.id+': '+proposal.summary.slice(0,70)]);
command('git',['push','--set-upstream','origin',branch]);
const body=[
 'Autonomous I.C.E. specialist proposal — DRAFT, manual review required.',
 '',
 'Work order: '+order.id,
 'Specialist: '+order.role,
 'Summary: '+proposal.summary,
 '',
 '## Changed files',
 ...manifest.map(x=>'- '+x.path),
 '',
 '## Agent-stated tests (not proof of execution)',
 ...(proposal.tests??[]).map(x=>'- '+x),
 '',
 '## Known risks',
 ...(proposal.risks??[]).map(x=>'- '+x),
 '',
 '## Spend',
 'Reported API text-token cost: $'+proposal.costUsd.toFixed(5),
 'Run: '+runId,
 '',
 'Do not merge without independent browser CI and human review.'
].join('\n');
const response=command('gh',['pr','create','--draft','--base','main','--head',branch,
 '--title','I.C.E. '+order.id+' — '+proposal.summary.slice(0,65),'--body',body]);
console.log('Draft PR created: '+response);
