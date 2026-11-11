// Operational specialist roster: persistent source-controlled expertise,
// disposable API sessions, one scoped task per activation.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const read=(p,root=ROOT)=>JSON.parse(readFileSync(join(root,p),'utf8'));
export function loadProfile(id,root=ROOT){
 if(typeof id!=='string'||!/^[a-z][a-z0-9_]{2,60}$/.test(id))throw Error('invalid agent identifier');
 const profile=read('studio/agents/profiles/'+id+'.json',root);
 if(profile.id!==id||!profile.system_instructions||!profile.handoff_to||
    !Array.isArray(profile.critical_inputs)||!profile.success_definition)
   throw Error('incomplete specialist profile: '+id);
 return profile;
}
export function getCrew(root=ROOT){
 const registry=read('studio/agents/roles.json',root);
 const ids=new Set();const crew=[];
 for(const role of registry.roles){
  if(ids.has(role.id))throw Error('duplicate specialist '+role.id);
  ids.add(role.id);
  const profile=loadProfile(role.id,root);
  if(!role.scope.some(scope=>profile.permitted_scope.includes(scope)))
   throw Error('profile scope mismatch '+role.id);
  crew.push({id:role.id,department:profile.department,mission:role.mission,
   profile,role});
 }
 if(crew.length!==25)throw Error('expected 25 roles, found '+crew.length);
 return crew;
}
export function validateMilestone(plan,crew=getCrew()){
 if(!plan||!Array.isArray(plan.task_nodes))throw Error('invalid milestone DAG');
 const ids=new Set(),knownRoles=new Set(crew.map(c=>c.id));
 const nodes=new Map();
 for(const task of plan.task_nodes){
  if(!task.id||ids.has(task.id))throw Error('duplicate/empty task id');
  if(!knownRoles.has(task.role))throw Error('unassigned department: '+task.role);
  if(!Array.isArray(task.depends_on))throw Error('task missing dependencies');
  if(!/^studio\/work-orders\/role-[a-z0-9-]+\.json$/.test(task.work_order))
   throw Error('work order is outside approved catalog');
  ids.add(task.id);nodes.set(task.id,task);
 }
 const visiting=new Set(),visited=new Set(),order=[];
 function visit(id){
  if(visiting.has(id))throw Error('cyclic task dependency at '+id);
  if(visited.has(id))return;
  const task=nodes.get(id);if(!task)throw Error('missing dependency '+id);
  visiting.add(id);
  for(const dep of task.depends_on)visit(dep);
  visiting.delete(id);visited.add(id);order.push(task);
 }
 for(const id of nodes.keys())visit(id);
 return order;
}
export function readyTasks(plan,completed=new Set(),crew=getCrew()){
 const sorted=validateMilestone(plan,crew);
 const done=new Set(completed);
 return sorted.filter(t=>!done.has(t.id)&&t.depends_on.every(id=>done.has(id)));
}
export function getDefaultMilestone(root=ROOT){return read('studio/production/pass-one-dag.json',root);}
