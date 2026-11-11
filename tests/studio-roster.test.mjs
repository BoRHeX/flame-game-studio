import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getCrew,loadProfile,validateMilestone,readyTasks,getDefaultMilestone} from '../studio/orchestrator/roster.mjs';
import {buildBrief} from '../studio/runtime/brief.mjs';
import {validateWorkOrder,compileBrief} from '../studio/orchestrator/context.mjs';
import {validateProposal} from '../studio/runtime/proposal.mjs';
const crew=getCrew(),milestone=getDefaultMilestone();
test('all 25 specialist agents have unique instructions and assigned departments',()=>{
 assert.equal(crew.length,25);
 assert.equal(new Set(crew.map(x=>x.id)).size,25);
 assert.equal(new Set(crew.map(x=>x.profile.system_instructions)).size,25);
 assert.equal(crew.filter(x=>x.department==='AI Orchestra').length,4);
 assert.ok(crew.every(x=>x.profile.critical_inputs.length>0&&x.profile.handoff_to));
});
test('every specialist has a callable, bounded, role-owned work order',()=>{
 for(const c of crew){
  const path='studio/work-orders/role-'+c.id.replaceAll('_','-')+'.json';
  const order=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(order.role,c.id);
  assert.equal(order.target_file.startsWith(order.allowed_paths[0]),true);
  validateWorkOrder(order);
  const brief=compileBrief(order);
  assert.equal(brief.role,c.id);
  const body=(order.target_file.endsWith('.json')?'{"test":true}\n':
   order.target_file.endsWith('.md')?'# Original draft\n':
   order.target_file.endsWith('.svg')?'<svg xmlns="http://www.w3.org/2000/svg"></svg>':
   'export const original = true;\n');
  const candidate={orderId:order.id,runId:'77882',
   changes:[{path:order.target_file,content:body}]};
  assert.doesNotThrow(()=>validateProposal(candidate,order));
  assert.throws(()=>validateProposal({...candidate,changes:[{path:'studio/runtime/runner.mjs',content:'x'}]},order));
 }
});
test('agent context supplies role-specific expertise, canon and relevant source contracts',()=>{
 const flame=buildBrief('studio/work-orders/role-particle-engineer.json');
 const audio=buildBrief('studio/work-orders/role-sound-engineer.json');
 assert.match(flame.agentProfile.system_instructions,/typed arrays/i);
 assert.match(audio.agentProfile.system_instructions,/Web Audio/i);
 assert.notEqual(flame.agentProfile.id,audio.agentProfile.id);
 assert.ok(flame.readOnlyDependencies.some(x=>x.path==='game/simulation/burner.mjs'));
 assert.ok(audio.readOnlyDependencies.some(x=>x.path==='game/audio/sound.mjs'));
 assert.match(flame.visualBrief,/pixel/i);
 assert.equal(flame.producerProfile.id,'producer');
 assert.equal(flame.qaProfile.id,'qa_architect');
});
test('one reviewed dependency graph includes each crew handoff without cycles',()=>{
 const sorted=validateMilestone(milestone,crew);
 assert.equal(sorted.length,milestone.task_nodes.length);
 assert.equal(readyTasks(milestone,new Set(),crew).length,1);
 assert.equal(readyTasks(milestone,new Set(['01-producer']),crew).some(t=>t.id==='02-contracts'),true);
 const bad={...milestone,task_nodes:milestone.task_nodes.map(x=>({...x}))};
 bad.task_nodes[0].depends_on=['21-release'];
 assert.throws(()=>validateMilestone(bad,crew),/cyclic/);
});
test('unrecognized specialist ID cannot be used to load a profile',()=>{
 assert.throws(()=>loadProfile('../../.github/secrets'));
});
