import test from 'node:test';
import assert from 'node:assert/strict';
import {OperatorAI} from '../game/npc/operator.mjs';
import {SaveStore,newGameSnapshot} from '../game/persistence/save-slots.mjs';
function memoryStorage(){
 const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),_data:data};
}
test('physical operator accepts only nearby authorized device work',()=>{
 const bot=new OperatorAI();
 const cmd={id:'adjust',type:'setDevice',deviceId:'draft',value:.6,jobId:'warehouse'};
 const ctx={distancePx:35,available:true,actorRole:'operator',authority:['operate'],jobId:'warehouse',missionStatus:'active'};
 assert.equal(bot.request(cmd,ctx).status,'accepted');
 assert.equal(bot.request(cmd,{...ctx,distancePx:200}).reason,'out-of-range');
 assert.equal(bot.request(cmd,{...ctx,authority:[]}).status,'refused');
 assert.equal(bot.request({...cmd,value:Infinity},ctx).status,'refused');
 const snapshot=bot.snapshot();assert.equal(snapshot.version,1);
 assert.equal(new OperatorAI().restore(snapshot).state,'refused');
});
test('three isolated slots and autosave survive reload and recover corruption',()=>{
 const store=memoryStorage(),saves=new SaveStore(store);
 const snapshot=newGameSnapshot();snapshot.economy.funds=88;snapshot.scene={id:'hub',stage:'hub'};snapshot.player={x:235,y:2248};
 assert.equal(saves.saveSlot(1,snapshot).ok,true);
 assert.equal(saves.listSlots().filter(x=>x.occupied).length,1);
 assert.equal(saves.saveAutosave(snapshot).ok,true);
 const loaded=new SaveStore(store);
 assert.equal(loaded.loadAutosave().economy.funds,88);
 assert.equal(loaded.loadSlot(1).player.x,235);
 assert.equal(loaded.loadSlot(2).economy.funds,undefined);
 snapshot.economy.funds=60;
 assert.equal(saves.saveSlot(1,snapshot).ok,true);
 store._data.set('ice.save.v1.slot.1','{broken');
 assert.equal(saves.loadSlot(1).economy.funds,88);
 assert.equal(saves.loadSlot(3).schemaVersion,1);
 assert.equal(saves.loadAutosave().economy.funds,88);
});
test('slot ids are constrained and corrupt primary cannot affect other slots',()=>{
 const store=memoryStorage(),saves=new SaveStore(store),data=newGameSnapshot();
 data.economy.funds=17;saves.saveSlot(2,data);
 assert.throws(()=>saves.loadSlot(0),/slot id/);
 assert.equal(saves.loadSlot(2).economy.funds,17);
});
