// Semantic validation at the persistence boundary, before any live-state mutation.
const ids=['backyard','warehouse','heat-hold'],stages=['hub','mission','won','failed'];
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const range=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function validGameState(s){
 if(!record(s)||s.schemaVersion!==1||!record(s.scene)||!stages.includes(s.scene.stage)||!['hub',...ids].includes(s.scene.id))return false;
 if(!record(s.player)||!range(s.player.x,0,1572)||!range(s.player.y,0,2448)||!range(s.economy?.funds,0,100000))return false;
 if(!record(s.controls)||!['joystick','buttons'].includes(s.controls.mode)||!['left','right'].includes(s.controls.hand))return false;
 if(!record(s.progression)||!Array.isArray(s.progression.completed)||s.progression.completed.some(x=>!ids.includes(x))||new Set(s.progression.completed).size!==s.progression.completed.length)return false;
 if(s.progression.operatorConsults!==undefined&&(!Number.isSafeInteger(s.progression.operatorConsults)||!range(s.progression.operatorConsults,0,100000)))return false;
 if(s.scene.stage==='hub')return s.scene.id==='hub'&&s.mission===null;
 if(!record(s.mission)||s.mission.jobId!==s.scene.id||!ids.includes(s.mission.jobId)||!record(s.mission.process))return false;
 const p=s.mission.process;
 if(!record(p.devices)||!['pilotFuel','pilotAir','mainFuel','mainAir','draft'].every(k=>range(p.devices[k],0,1)))return false;
 for(const k of ['pilotLit','mainLit','failed'])if(typeof p[k]!=='boolean')return false;
 for(const k of ['time','unburntFuel','temperature','heatRelease','stability','soot','pilotStability','mainRatio','fuelFlow','airFlow','peakTemperature','overheatSeconds'])if(!range(p[k],0,k==='time'?100000:100))return false;
 if(!range(s.mission.missionTime,0,100000))return false;
 const e=s.mission.evaluator;if(!record(e)||!range(e.elapsed,0,100000)||!range(e.hold,0,10000)||!['active','won','failed'].includes(e.status))return false;
 if((s.scene.stage==='mission'&&e.status!=='active')||(s.scene.stage!=='mission'&&e.status!==s.scene.stage))return false;
 return true;
}
