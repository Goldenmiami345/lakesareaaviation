import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airportFraming } from './airport-framing';
import { airportTraffic } from './site-data';
import { patternFor, patternWaypoints } from './traffic-pattern';
for (const [width,height,phone] of [[390,844,true],[1280,900,false]] as const) {
  test(`airport zoom never exceeds ${phone?'25%':'15%'} and fits every runway pattern at ${width}`,()=>{
    const safe={left:18,top:165,right:width-(phone?80:235),bottom:height-(phone?180:315)};
    for(const field of Object.values(airportTraffic))for(const end of field.ends){
      const a=patternFor(field,end),f=airportFraming(a,width,height,phone,safe);
      assert.ok(f.multiplier<= (phone?1.25:1.15)+1e-8);
      const [x=0,y=0]=f.viewBox.split(' ').map(Number);
      for(const p of patternWaypoints(a)){
        assert.ok((p.x-x)*f.scale>=safe.left);assert.ok((p.x-x)*f.scale<=safe.right);
        assert.ok((p.y-y)*f.scale>=safe.top);assert.ok((p.y-y)*f.scale<=safe.bottom);
      }
    }
  });
}
test('desktop reaches 1.15× for every airport and both runway ends at 1280×900',()=>{
  const safe={left:18,top:88,right:1262,bottom:882};
  const obstacles=[{left:32,top:96,right:358,bottom:176},{left:1088,top:370,right:1248,bottom:530},{left:32,top:630,right:410,bottom:836}];
  for(const field of Object.values(airportTraffic))for(const end of field.ends){
    const a=patternFor(field,end),f=airportFraming(a,1280,900,false,safe,obstacles);
    assert.equal(f.multiplier,1.15);
    const [x=0,y=0]=f.viewBox.split(' ').map(Number);
    const points=patternWaypoints(a);
    for(let i=0;i<points.length-1;i++){
      const p=points[i],q=points[i+1];if(!p||!q)continue;
      for(let j=0;j<=100;j++){
        const sx=(p.x+(q.x-p.x)*j/100-x)*f.scale,sy=(p.y+(q.y-p.y)*j/100-y)*f.scale;
        assert.ok(sx>=safe.left&&sx<=safe.right&&sy>=safe.top&&sy<=safe.bottom);
        assert.ok(!obstacles.some(o=>sx>=o.left&&sx<=o.right&&sy>=o.top&&sy<=o.bottom));
      }
    }
  }
});