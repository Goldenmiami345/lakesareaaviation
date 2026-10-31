import { patternWaypoints, type PatternAirport } from './traffic-pattern';
export type SafeRect = { left: number; top: number; right: number; bottom: number };
/** Image-space geometry is unchanged. Scale is pixels per USGS pixel, not speed. */
export function airportFraming(a: PatternAirport, width: number, height: number, phone: boolean, safe: SafeRect, obstacles: SafeRect[] = []) {
  const points = patternWaypoints(a).slice(0, -1);
  const cx = points.reduce((s,p)=>s+p.x,0)/points.length;
  const cy = points.reduce((s,p)=>s+p.y,0)/points.length;
  const rx = Math.max(...points.map(p=>Math.abs(p.x-cx))) + 28;
  const ry = Math.max(...points.map(p=>Math.abs(p.y-cy))) + 28;
  const base = phone ? Math.max(width/970,height/2100) : Math.max(width/1500,height/1500);
  const requested = phone ? 1.25 : 1.15;
  let scale = Math.min(base*requested,(safe.right-safe.left)/(2*rx),(safe.bottom-safe.top)/(2*ry));
  let centerX=(safe.left+safe.right)/2, centerY=(safe.top+safe.bottom)/2;
  if (!phone) {
    // Desktop copy is lower-left, not a full-width exclusion band. Test the
    // actual flown segments in the right two-thirds around individual UI boxes.
    const samples=points.flatMap((p,i)=>{const q=points[(i+1)%points.length]??p;return Array.from({length:41},(_,j)=>({x:p.x+(q.x-p.x)*j/40,y:p.y+(q.y-p.y)*j/40}));});
    const candidates=[];
    for(let x=width*.52;x<=width*.82;x+=8)for(let y=safe.top;y<=safe.bottom;y+=8)candidates.push({x,y});
    candidates.sort((a,b)=>Math.hypot(a.x-width*2/3,a.y-height*.52)-Math.hypot(b.x-width*2/3,b.y-height*.52));
    for (const multiplier of [1.15,1.1,1.05,1]) {
      const k=base*multiplier;
      const fit=candidates.find(c=>samples.every(p=>{
        const x=c.x+(p.x-cx)*k,y=c.y+(p.y-cy)*k;
        return x>=safe.left+12&&x<=safe.right-12&&y>=safe.top+12&&y<=safe.bottom-12&&!obstacles.some(o=>x>=o.left-14&&x<=o.right+14&&y>=o.top-14&&y<=o.bottom+14);
      }));
      if(fit){scale=k;centerX=fit.x;centerY=fit.y;break;}
    }
  }
  const x = cx-centerX/scale;
  const y = cy-centerY/scale;
  return { viewBox: `${x} ${y} ${width/scale} ${height/scale}`, multiplier: scale/base, scale, cx, cy };
}