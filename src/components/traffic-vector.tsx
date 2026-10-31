import { aircraftType } from '../lib/traffic-flight';

// Original SVG source, not traced logos or invented tail lettering. Wingspan is
// one local unit; lengths are proportional to published type dimensions. Paint
// tokens were sampled on the real fleet photo's sunlit base/stripe panels.
export const AIRCRAFT_SPANS: Record<string, number> = {N6717A:36,N8570B:36,N7108G:36,N6641F:33,N11059:34,N3353P:37};
export function TrafficVector({reg, shadow=false}: {reg:string;shadow?:boolean}) {
  const type=aircraftType(reg), twin=type==='apache', tandem=type==='citabria';
  const length=type==='150'?72:tandem?67:75;
  const wingY=twin?4:-7;
  return <g className={`aircraft-vector paint-${reg.toLowerCase()}${shadow?' aircraft-shadow':''}`} transform="scale(.01)">
    <path className="aircraft-base" d={`M-50 ${wingY-4} L-47 ${wingY-8} L-6 ${wingY-10} L6 ${wingY-10} L47 ${wingY-8} L50 ${wingY-4} L49 ${wingY+4} L8 ${wingY+6} L-8 ${wingY+6} L-49 ${wingY+4} Z`} />
    <path className="aircraft-stripe" d={`M-49 ${wingY+1} L49 ${wingY+1} L49 ${wingY+4} L-49 ${wingY+4} Z`} />
    <path className="aircraft-base" d={`M0 ${-length/2} C-4 ${-length/2} -6 -24 -5 -12 L-3 16 L-2 ${length/2} L2 ${length/2} L3 16 L5 -12 C6 -24 4 ${-length/2} 0 ${-length/2}Z`} />
    <path className="aircraft-stripe" d={`M-3 -25 L-2 ${length/2} L0 ${length/2-2} L0 -26 Z`} />
    <path className="aircraft-base" d={`M-17 ${length/2-8} L-3 ${length/2-12} L3 ${length/2-12} L17 ${length/2-8} L16 ${length/2-3} L-16 ${length/2-3} Z`} />
    <path className="aircraft-stripe" d={`M-16 ${length/2-5} L16 ${length/2-5} L16 ${length/2-3} L-16 ${length/2-3} Z`} />
    <path className="aircraft-glass" d={tandem?'M-2 -22 L2 -22 L2 -3 L-2 -3 Z':'M-4 -23 L4 -23 L4 -13 L-4 -13 Z'} />
    {tandem&&<path className="aircraft-detail" d="M-2 -12H2"/>}
    {!twin&&<><path className="aircraft-detail" d={`M-10 ${-length/2+1}H10 M-3 8L-19 ${wingY+5} M3 8L19 ${wingY+5}`}/><path className="aircraft-gear" d="M-7 7h2v5h-2z M5 7h2v5H5z"/></>}
    {twin&&[-20,20].map(x=><g key={x}><path className="aircraft-base" d={`M${x-4} -23 Q${x} -29 ${x+4} -23 L${x+3} 12 Q${x} 17 ${x-3} 12 Z`}/><path className="aircraft-stripe" d={`M${x-3} -23H${x+3}V-18H${x-3}Z`}/><path className="aircraft-detail" d={`M${x-11} -24H${x+11}`}/></g>)}
  </g>;
}