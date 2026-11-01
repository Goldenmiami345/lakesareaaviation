import { patternWaypoints, type PatternAirport } from './traffic-pattern';
/** Both simulation and path use these exact linear waypoint segments. */
export function trafficPath(a: PatternAirport) {
  const points=patternWaypoints(a);
  const d=points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
  const first=points[0],final=points[6];
  const finalD=first&&final?`M ${final.x} ${final.y} L ${first.x} ${first.y}`:'';
  const legs=[{i:1,label:'UPWIND'},{i:2,label:'CROSSWIND'},{i:3,label:`${a.side.toUpperCase()} DOWNWIND ${a.runway}`},{i:5,label:'BASE'},{i:6,label:'FINAL'}];
  const cx=points.slice(0,-1).reduce((s,p)=>s+p.x,0)/7,cy=points.slice(0,-1).reduce((s,p)=>s+p.y,0)/7;
  const labels=legs.flatMap(({i,label})=>{const p=points[i],q=points[i===3?5:i+1];if(!p||!q)return [];const x=(p.x+q.x)/2,y=(p.y+q.y)/2,len=Math.hypot(q.x-p.x,q.y-p.y)||1,tx=(q.x-p.x)/len,ty=(q.y-p.y)/len;let nx=-ty,ny=tx;if(nx*(x-cx)+ny*(y-cy)<0){nx=-nx;ny=-ny;}return [{label,x,y,dx:nx,dy:ny,tx,ty,len}];});
  return {d,finalD,labels};
}