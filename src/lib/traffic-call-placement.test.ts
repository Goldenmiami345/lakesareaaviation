import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callSideCandidates, callSideFits } from './traffic-call-placement';

test('phone leaders end at most 28 screen pixels from the airplane center', () => {
  for(const side of callSideCandidates(150,390,{x:1,y:-1})) assert.ok(Math.hypot(side.tx,side.ty)<=28+1e-9);
});
test('desktop leaders end at most 40 screen pixels, including the 640px breakpoint', () => {
  for(const width of [640,1280]) for(const side of callSideCandidates(150,width,{x:1,y:1})) assert.ok(Math.abs(Math.hypot(side.tx,side.ty)-40)<1e-9);
});
test('prefer away from runway and flip opposite when the panel edge blocks it', () => {
  const sides=callSideCandidates(100,390,{x:1,y:0}), outside=sides[0], opposite=sides[1];
  assert.ok(outside && opposite);
  assert.ok(outside.tx>0 && opposite.tx<0);
  const safe={l:0,t:0,r:390,b:844}, plane=[{x:350,y:300}];
  assert.equal(callSideFits(outside,plane,[],safe),false);
  assert.equal(callSideFits(opposite,plane,[],safe),true);
});