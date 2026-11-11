// Independently recorded before ICE-FLOW-001. Run only after applying its candidate.
import assert from 'node:assert/strict';
import {CHAMBERS,flowAt} from '../../game/chambers/flow.mjs';
const fixtures=[
  {
    "id": "backyard",
    "x": 94,
    "y": 174,
    "seed": 0,
    "vx": 243.953125,
    "vy": 2.2358564211570218
  },
  {
    "id": "backyard",
    "x": 330,
    "y": 160,
    "seed": 0.2,
    "vx": 278.984375,
    "vy": -2.186682136556187
  },
  {
    "id": "backyard",
    "x": 400,
    "y": 120,
    "seed": 1.7,
    "vx": 289.375,
    "vy": -1.4150852192522287
  },
  {
    "id": "backyard",
    "x": 600,
    "y": 300,
    "seed": -2,
    "vx": 319.0625,
    "vy": -4.175502413123578
  },
  {
    "id": "backyard",
    "x": 310,
    "y": 277,
    "seed": 0,
    "vx": 276.015625,
    "vy": 0.129129490334027
  },
  {
    "id": "warehouse",
    "x": 94,
    "y": 174,
    "seed": 0,
    "vx": 183.02437500000002,
    "vy": 8.44766875828098
  },
  {
    "id": "warehouse",
    "x": 330,
    "y": 160,
    "seed": 0.2,
    "vx": 196.448125,
    "vy": -8.444923905257893
  },
  {
    "id": "warehouse",
    "x": 400,
    "y": 120,
    "seed": 1.7,
    "vx": 204.34500000000003,
    "vy": -7.102015311233244
  },
  {
    "id": "warehouse",
    "x": 600,
    "y": 300,
    "seed": -2,
    "vx": 240.10750000000002,
    "vy": -10.51155892855724
  },
  {
    "id": "warehouse",
    "x": 310,
    "y": 277,
    "seed": 0,
    "vx": 207.391875,
    "vy": 4.546179114235899
  },
  {
    "id": "heat-hold",
    "x": 94,
    "y": 174,
    "seed": 0,
    "vx": 4.477212958449026,
    "vy": -181.40416666666667
  },
  {
    "id": "heat-hold",
    "x": 330,
    "y": 160,
    "seed": 0.2,
    "vx": -2.1591982028959187,
    "vy": -189.32555555555558
  },
  {
    "id": "heat-hold",
    "x": 400,
    "y": 120,
    "seed": 1.7,
    "vx": -2.2286292932879626,
    "vy": -196.18666666666667
  },
  {
    "id": "heat-hold",
    "x": 600,
    "y": 300,
    "seed": -2,
    "vx": -2.626335155250402,
    "vy": -159.79166666666669
  },
  {
    "id": "heat-hold",
    "x": 310,
    "y": 277,
    "seed": 0,
    "vx": 4.4593046262055,
    "vy": -163.73680555555555
  }
];
const close=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-10,label);
assert.deepEqual(Object.keys(CHAMBERS).sort(),['backyard','heat-hold','warehouse']);
const scratch={vx:NaN,vy:NaN,retained:'caller-owned'};
for(let repeat=0;repeat<100;repeat++)for(const fixture of fixtures){
 const {id,x,y,seed,vx,vy}=fixture;
 const vector=flowAt(CHAMBERS[id],x,y,seed,scratch);
 assert.equal(vector,scratch,'flowAt must reuse the supplied output object');
 assert.equal(vector.retained,'caller-owned');
 close(vector.vx,vx,id+' reusable vx');
 close(vector.vy,vy,id+' reusable vy');
 const legacy=flowAt(CHAMBERS[id],x,y,seed);
 assert.notEqual(legacy,flowAt(CHAMBERS[id],x,y,seed),'legacy calls must return independent objects');
 assert.deepEqual(Object.keys(legacy).sort(),['vx','vy']);
 close(legacy.vx,vx,id+' legacy vx');
 close(legacy.vy,vy,id+' legacy vy');
}
assert.deepEqual(flowAt(CHAMBERS.backyard,94,174),flowAt(CHAMBERS.backyard,94,174,0));
assert.equal(flowAt(CHAMBERS.backyard,94,174,undefined,scratch),scratch);
close(scratch.vx,fixtures[0].vx,'default seed vx');
close(scratch.vy,fixtures[0].vy,'default seed vy');
console.log('PASS ICE-FLOW-001: 15 recorded flow fixtures, 1,500 output reuses, legacy/default-seed compatibility');

