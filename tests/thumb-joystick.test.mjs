import test from 'node:test';
import assert from 'node:assert/strict';
import {thumbVector} from '../game/input/thumb-joystick.mjs';

test('thumb vector has a dead zone and cannot exceed full speed',()=>{
  assert.deepEqual(thumbVector(2,2,30),{x:0,y:0});
  assert.deepEqual(thumbVector(1000,0,30),{x:1,y:0});
  assert.deepEqual(thumbVector(-1000,0,30),{x:-1,y:0});
  assert.deepEqual(thumbVector(0,-1000,30),{x:0,y:-1});
});
test('analog travel scales walking and keeps climbing free from accidental lateral input',()=>{
  const short=thumbVector(16,0,36),long=thumbVector(33,0,36);
  assert.ok(short.x>0&&short.x<long.x&&long.x<=1);
  const diagonal=thumbVector(9,-28,36);
  assert.equal(diagonal.x,0);assert.ok(diagonal.y<0);
  const sideways=thumbVector(30,-6,36);
  assert.equal(sideways.y,0);assert.ok(sideways.x>0);
});
test('invalid joystick geometry never starts movement',()=>{
  assert.deepEqual(thumbVector(Number.NaN,0,30),{x:0,y:0});
  assert.deepEqual(thumbVector(20,0,0),{x:0,y:0});
});
