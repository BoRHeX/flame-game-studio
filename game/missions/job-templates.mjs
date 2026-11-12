// I.C.E. Pass Two mission feedback, adapted from the mission engineer's
// reviewed source proposal in work order ICE-ROLE-09 (run 43124008655).
// The source of truth for physical outcomes is still JOBS/MissionEvaluator.
import {JOBS} from './jobs.mjs';
const META=Object.freeze({
 backyard:{focus:'pilot-to-main',unlit:'pilot-unlit',unstable:'flame-unstable'},
 warehouse:{focus:'restricted-draft',unlit:'restart-unlit',unstable:'draft-or-flame-unstable'},
 'heat-hold':{focus:'temperature-soot-stability',unlit:'heater-unlit',unstable:'flame-unstable'}
});
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function validateJob(j){
 if(!record(j)||!Object.hasOwn(META,j.id)||j.chamber!==j.id||
 !Number.isFinite(j.deadline)||j.deadline<=0||
 !Number.isFinite(j.payout)||j.payout<0||
 !record(j.objective)||!Number.isFinite(j.objective.seconds)||j.objective.seconds<=0||
 !Number.isFinite(j.objective.minStability)||j.objective.minStability<0||j.objective.minStability>1||
 !record(j.burner)||!Object.values(j.burner).every(v=>Number.isFinite(v)&&v>=0&&v<=3))
 throw new TypeError('Invalid authored job');
 const o=j.objective;
 if(o.type==='temperature-hold'&&(!Number.isFinite(o.minTemp)||!Number.isFinite(o.maxTemp)||
 o.maxTemp<o.minTemp||!Number.isFinite(o.maxSoot)||o.maxSoot<0||o.maxSoot>1))
 throw new TypeError('Invalid heat-hold window');
}
export const JOB_TEMPLATES=Object.freeze(JOBS.map(job=>{
 validateJob(job);
 return Object.freeze({id:job.id,job,objective:job.objective,
  focus:META[job.id].focus,cues:Object.freeze({...META[job.id]})});
}));
if(JOB_TEMPLATES.length!==3||new Set(JOB_TEMPLATES.map(t=>t.id)).size!==3)
 throw new TypeError('Expected three different authored missions');
export function getJobTemplate(id){
 if(typeof id!=='string'||!id)throw new TypeError('Invalid mission identifier');
 return JOB_TEMPLATES.find(t=>t.id===id)||null;
}
export function missionWarnings(template,state,context={}){
 if(!JOB_TEMPLATES.includes(template)||!record(state)||!record(context)||
 typeof state.failed!=='boolean'||typeof state.pilotLit!=='boolean'||
 typeof state.mainLit!=='boolean'||!Number.isFinite(state.stability))
 throw new TypeError('Invalid mission warning context');
 const warnings=[];
 if(state.failed)warnings.push('burner-failed');
 if(Number.isFinite(context.money)&&context.money<=0)warnings.push('funds-depleted');
 if(Number.isFinite(context.elapsed)&&context.elapsed>=template.job.deadline)warnings.push('deadline');
 if(!state.pilotLit||!state.mainLit)warnings.push(template.cues.unlit);
 else if(state.stability<template.objective.minStability)warnings.push(template.cues.unstable);
 if(template.objective.type==='temperature-hold'){
  if(!Number.isFinite(state.temperature)||!Number.isFinite(state.soot))throw new TypeError('Heat state absent');
  if(state.temperature<template.objective.minTemp)warnings.push('temperature-low');
  if(state.temperature>template.objective.maxTemp)warnings.push('temperature-high');
  if(state.soot>template.objective.maxSoot)warnings.push('soot-high');
 }
 if(template.id==='warehouse'&&Number.isFinite(state.devices?.draft)&&state.devices.draft<0.55)
  warnings.push('draft-restricted');
 return warnings;
}
export function missionOutcome(template,status){
 if(!JOB_TEMPLATES.includes(template))throw new TypeError('Unknown job template');
 if(status==='active')return null;
 if(status==='won')return {status,payout:template.job.payout};
 if(status==='failed')return {status,payout:0};
 throw new TypeError('Unsupported terminal mission status');
}
