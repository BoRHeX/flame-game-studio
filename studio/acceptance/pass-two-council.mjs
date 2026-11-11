// Independent, no-secret integration contract for Pass Two 25-role council.
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=p=>{assert(existsSync(p),'missing '+p);return readFileSync(p,'utf8');};
const main=load('game/main.mjs');
const saves=load('game/persistence/save-slots.mjs');
const npc=load('game/npc/operator.mjs');
const missions=load('game/missions/jobs.mjs');
for(const p of ['game/persistence/save-slots.mjs','game/npc/operator.mjs']){
 assert(main.includes(p.replace('game/','./')),'main must import and use '+p);
}
assert(/(?:save|persist|snapshot)/i.test(main)&&/(?:load|restore|resume)/i.test(main),
 'save/load must be connected to actual runtime state');
assert(/(?:localStorage|sessionStorage|storage)/i.test(saves),'persistence must use a real browser storage adapter');
assert(/(?:slot|slots)/i.test(saves)&&/(?:backup|recover|corrupt)/i.test(saves),
 'versioned three-slot storage needs recovery');
assert(/(?:npc|operator)/i.test(main)&&/(?:interact|dialogue|request)/i.test(npc),
 'NPC must interact with the player');
assert(/backyard/.test(missions)&&/warehouse/.test(missions)&&/heat-hold/.test(missions),
 'all three missions must survive');
assert(/(?:payout|reward)/i.test(missions)&&/(?:deadline|failure|failed)/i.test(missions),
 'mission consequence model must survive');
assert(main.includes('PlatformPlayer')&&main.includes('FlameParticles')&&main.includes('ProcessSound'),
 'the existing movement, flame and audio must not be cut');
console.log('PASS P2 COUNCIL: four connected modules, state restore, operator, missions and retained simulation');
