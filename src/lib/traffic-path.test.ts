import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trafficPath } from './traffic-path';
import { makeFlightPlan,sampleFlight } from './traffic-flight';
import { airportTraffic } from './site-data';
import { patternFor,patternWaypoints } from './traffic-pattern';
test('visible path is the exact flight trajectory through every turn and runway direction',()=>{
  for(const field of Object.values(airportTraffic))for(const end of field.ends){
    const a=patternFor(field,end),pts=patternWaypoints(a),path=trafficPath(a);
    assert.equal(path.d,pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '));
    const plan=makeFlightPlan(a,a.aircraft[0]??'N8570B');
    for(let i=0;i<1000;i++){
      const s=sampleFlight(plan,plan.seconds*i/1000);
      const distance=Math.min(...pts.slice(0,-1).map((p,j)=>{const q=pts[j+1];if(!q)return Infinity;const dx=q.x-p.x,dy=q.y-p.y;const f=Math.max(0,Math.min(1,((s.x-p.x)*dx+(s.y-p.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(s.x-p.x-f*dx,s.y-p.y-f*dy);}));
      assert.ok(distance<1e-7);
    }
    assert.equal(path.labels.length,5);
    assert.ok(path.labels.some(l=>l.label===`${end.side.toUpperCase()} DOWNWIND ${end.runway}`));
  }
});