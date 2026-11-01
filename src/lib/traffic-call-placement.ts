export type CallBox = { l: number; t: number; r: number; b: number };
export type CallSide = { ox: number; oy: number; sy: number; W: number; tx: number; ty: number };
const hits = (a: CallBox, b: CallBox) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/** All distances are screen pixels, independent of map scale or pinch zoom. */
export function callSideCandidates(width: number, viewportWidth: number, outside: { x: number; y: number }): CallSide[] {
  const cap = viewportWidth < 640 ? 28 : 40;
  const directions: [number,number][] = [[1,-1],[-1,-1],[1,1],[-1,1],[1,0],[-1,0],[0,-1],[0,1]];
  directions.sort((a,b) => (b[0]*outside.x+b[1]*outside.y)/Math.hypot(...b) - (a[0]*outside.x+a[1]*outside.y)/Math.hypot(...a));
  const first = directions[0];
  if (first) {
    const opposite = directions.findIndex(d => d[0] === -first[0] && d[1] === -first[1]);
    if (opposite > 1) directions.splice(1,0,...directions.splice(opposite,1));
  }
  return directions.map(([sx=0,sy=0]) => {
    const length = Math.hypot(sx,sy) || 1;
    const tx = sx*cap/length, ty = sy*cap/length;
    return { ox: sx>0 ? tx : sx<0 ? tx-width : -width/2, oy: sy>0 ? ty : sy<0 ? ty-30 : -15, sy, W:width, tx, ty };
  });
}

export function callSideFits(side: CallSide, points: {x:number;y:number}[], blocked: CallBox[], safe: CallBox) {
  return points.every(({x,y}) => {
    const box={l:x+side.ox,t:y+side.oy,r:x+side.ox+side.W,b:y+side.oy+30};
    return box.l>=safe.l && box.r<=safe.r && box.t>=safe.t && box.b<=safe.b && !blocked.some(b=>hits(box,b));
  });
}