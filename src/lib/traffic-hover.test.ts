import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldCloseTrafficHover } from './traffic-hover';
test('moving aircraft cannot close a stationary pointer card; pointer must travel more than 24px', () => {
  assert.equal(shouldCloseTrafficHover({x:100,y:100},{x:100,y:100},true,false),false);
  assert.equal(shouldCloseTrafficHover({x:100,y:100},{x:124,y:100},true,false),false);
  assert.equal(shouldCloseTrafficHover({x:100,y:100},{x:125,y:100},true,false),true);
});
test('card and hit areas protect hover; leaving airport closes it', () => {
  assert.equal(shouldCloseTrafficHover({x:0,y:0},{x:100,y:100},true,true),false);
  assert.equal(shouldCloseTrafficHover({x:0,y:0},{x:0,y:0},false,false),true);
});