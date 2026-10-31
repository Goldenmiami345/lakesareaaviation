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