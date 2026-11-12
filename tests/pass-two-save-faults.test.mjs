import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,newGameSnapshot,migrateSnapshot} from '../game/persistence/save-slots.mjs';
import {validGameState} from '../game/persistence/game-state.mjs';
const key='ice.save.v1.slot.1';
function storage(){const data=new Map();let fail=null;return {data,setFailure:f=>fail=f,getItem(k){if(fail?.('get',k))throw Error('read fault');return data.get(k)??null;},setItem(k,v){if(fail?.('set',k))throw Error('write fault');data.set(k,String(v));},removeItem(k){if(fail?.('remove',k))throw Error('remove fault');data.delete(k);}};}
function state(funds=90){return {...newGameSnapshot(),player:{x:180,y:2248},economy:{funds},scene:{id:'hub',stage:'hub'},controls:{mode:'joystick',hand:'left'},progression:{completed:[],operatorConsults:0}};}
test('transaction faults before promotion preserve the previous committed save',()=>{
 for(const [op,suffix] of [['set','.stage'],['get','.stage'],['set','.backup'],['get','.backup'],['set','']]){
  const db=storage(),store=new SaveStore(db,validGameState);assert.equal(store.saveSlot(1,state(90)).ok,true);
  db.setFailure((o,k)=>o===op&&k===key+suffix);assert.equal(store.saveSlot(1,state(50)).ok,false,op+suffix);
  db.setFailure(null);assert.equal(store.loadSlot(1).economy.funds,90,op+suffix+' lost previous save');
 }
});
test('post-promotion verification reports committed uncertainty; cleanup failure remains committed',()=>{
 const db=storage(),store=new SaveStore(db,validGameState);store.saveSlot(1,state(90));let promoted=false;
 db.setFailure((o,k)=>{if(o==='set'&&k===key)promoted=true;return promoted&&o==='get'&&k===key;});
 assert.deepEqual(store.saveSlot(1,state(50)),{ok:true,committed:true,verified:false,error:'read fault'});
 db.setFailure(null);assert.equal(store.loadSlot(1).economy.funds,50);
 db.setFailure((o)=>o==='remove');assert.equal(store.saveSlot(1,state(40)).ok,true);db.setFailure(null);assert.equal(store.loadSlot(1).economy.funds,40);
});
test('valid JSON with invalid game data recovers the semantic backup, not a broken live world',()=>{
 const db=storage(),store=new SaveStore(db,validGameState);store.saveSlot(1,state(90));store.saveSlot(1,state(50));
 const bad=state(500);bad.player.x=999999;db.data.set(key,JSON.stringify(bad));assert.equal(store.loadSlot(1).economy.funds,90);assert.equal(store.listSlots()[0].source,'backup');
 db.data.set(key+'.backup','{bad');assert.equal(store.listSlots()[0].occupied,false);assert.equal(store.saveSlot(2,bad).ok,false);
});
test('explicit v0 migration and unknown future save protection retain data',()=>{
 const old=state();old.schemaVersion=0;delete old.workshop;const result=migrateSnapshot(old);assert.equal(result.schemaVersion,1);assert.deepEqual(result.workshop,{});assert.equal(old.schemaVersion,0);
 const db=storage(),store=new SaveStore(db,validGameState),future={...state(),schemaVersion:99};db.data.set(key,JSON.stringify(future));assert.equal(store.saveSlot(1,state()).ok,false);assert.equal(JSON.parse(db.data.get(key)).schemaVersion,99);
});
