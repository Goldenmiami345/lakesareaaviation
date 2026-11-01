import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aircraftType,legSpeed,groundSpeed,makeFlightPlan,sampleFlight,REAL_TIME_RATE,CALL_DURATION_MS,PING_DURATION_MS,MAX_CALLS} from './traffic-flight';
import {airportTraffic} from './site-data';
import {feetPerPixel,patternWaypoints} from './traffic-pattern';
test('traffic uses 1.0 real time',()=>assert.equal(REAL_TIME_RATE,1));
test('trainers use requested leg speeds',()=>{
 for(const type of ['172','150','citabria'] as const){assert.ok(legSpeed(type,'Upwind')>=70&&legSpeed(type,'Upwind')<=75);assert.equal(legSpeed(type,'Crosswind'),75);assert.equal(legSpeed(type,'Base'),70);assert.ok(legSpeed(type,'Final')>=60&&legSpeed(type,'Final')<=65);assert.equal(legSpeed(type,'Touch-and-go'),55);}
 assert.equal(legSpeed('172','Downwind'),85);assert.equal(legSpeed('150','Downwind'),78);assert.equal(legSpeed('citabria','Downwind'),78);
});
test('Apache uses 100 downwind, 90 base, 85 final',()=>{assert.equal(legSpeed('apache','Downwind'),100);assert.equal(legSpeed('apache','Base'),90);assert.equal(legSpeed('apache','Final'),85);assert.equal(aircraftType('N4383P'),'apache');});
test('wind changes GS without invented variable components',()=>{assert.equal(groundSpeed(85,{dir:131,kt:10},131),75);assert.equal(groundSpeed(85,{dir:311,kt:10},131),95);assert.equal(groundSpeed(85,{dir:null,kt:10},131),85);});
test('map derivative equals displayed ground speed within rounding',()=>{
 const a=airportTraffic.KLXL;const plan=makeFlightPlan(a,'N6717A',{dir:131,kt:10},131);
 for(let t=1;t<plan.seconds-1;t+=.7){const p=sampleFlight(plan,t),q=sampleFlight(plan,t+.001);const kt=Math.hypot(q.x-p.x,q.y-p.y)/.001*feetPerPixel(a)*.3048/(1852/3600);assert.ok(Math.abs(kt-p.knots)<.51,`${t}: ${kt} vs ${p.knots}`);}
});
test('speed is continuous at every leg boundary',()=>{const plan=makeFlightPlan(airportTraffic.KLXL,'N4383P',{dir:150,kt:12},131);for(const s of plan.segments){assert.ok(Math.abs(sampleFlight(plan,s.start-.001).knots-sampleFlight(plan,s.start+.001).knots)<=1);}});
test('flight uses all original corners and altitude endpoints',()=>{const a=airportTraffic.KLXL,plan=makeFlightPlan(a,'N6717A');for(const p of patternWaypoints(a)){assert.ok(plan.segments.some(s=>Math.hypot(s.p.x-p.x,s.p.y-p.y)<.001&&Math.abs(s.p.agl-p.agl)<.001)||plan.segments.some(s=>Math.hypot(s.q.x-p.x,s.q.y-p.y)<.001));}});
test('calls last 3.5s, ping lasts .6s and max two',()=>{assert.equal(CALL_DURATION_MS,3500);assert.equal(PING_DURATION_MS,600);assert.equal(MAX_CALLS,2);});