import { aircraftType } from '../lib/traffic-flight';
import apache from '../assets/models/n4383p_top.png.asset.json';
import phoenix from '../assets/models/n8570b_top.png.asset.json';
import cardinal from '../assets/models/n46201_top.png.asset.json';
import { MODEL_WINGSPANS_M, trafficPresentationScale } from '../lib/model-settings';
import { SHOW_3D_MODELS, USE_RENDERED_TOP_SPRITES } from '../lib/site-data';
import apacheTop from '../assets/fleet/top/n4383p-top.webp.asset.json';
import phoenixTop from '../assets/fleet/top/n8570b-top.webp.asset.json';
import cardinalTop from '../assets/fleet/top/n46201-top.webp.asset.json';
// Photo-derived top renders: nose up, image width = wingspan exactly (640px wide).
const topRenders: Record<string, { url: string; aspect: number }> = { N4383P: { url: apacheTop.url, aspect: 477 / 640 }, N8570B: { url: phoenixTop.url, aspect: 462 / 640 }, N46201: { url: cardinalTop.url, aspect: 474 / 640 } };
/** True when the aerial view draws this registration from its real top render. */
export const hasTopRender = (reg: string) => USE_RENDERED_TOP_SPRITES && !!topRenders[reg];
const renders: Record<string, { url: string; height: number }> = { N4383P: {url:apache.url,height:766}, N8570B:{url:phoenix.url,height:748}, N46201:{url:cardinal.url,height:769} };
export function trafficSpanFeet(reg: string, topRender = false) { return (topRender || SHOW_3D_MODELS) && MODEL_WINGSPANS_M[reg] ? MODEL_WINGSPANS_M[reg] / 0.3048 : AIRCRAFT_SPANS[reg] ?? 36; }
export const trafficModelScale = (reg: string, topRender = false) => topRender && MODEL_WINGSPANS_M[reg] ? 1 : trafficPresentationScale(reg);

// Original SVG source, not traced logos or invented tail lettering. Wingspan is
// one local unit; lengths are proportional to published type dimensions. Paint
// tokens were sampled on the real fleet photo's sunlit base/stripe panels.
export const AIRCRAFT_SPANS: Record<string, number> = {N6717A:36,N8570B:36,N46201:36,N7108G:36,N6641F:33,N11059:34,N4383P:37};
export function TrafficVector({reg, shadow=false, topRender=false}: {reg:string;shadow?:boolean;topRender?:boolean}) {
  const top=topRender&&hasTopRender(reg)?topRenders[reg]:undefined;
  // Literal wingspan = 1 local unit; the shadow reuses the sprite's alpha silhouette.
  if(top) return <image className={shadow?'aircraft-render-shadow':'aircraft-top-render'} href={top.url} x={-.5} y={-top.aspect/2} width={1} height={top.aspect} preserveAspectRatio="none" />;
  const render=renders[reg];
  // Transparent wings reach x=19..1005: normalize the actual 986px wingspan,
  // not the padded 1024px canvas. Nose-up is the same local axis as the SVG.
  if(SHOW_3D_MODELS && render) return <image className={shadow?'aircraft-render-shadow':undefined} href={render.url} x={-512/986} y={-render.height/1972} width={1024/986} height={render.height/986} preserveAspectRatio="none" />;
  const type=aircraftType(reg), twin=type==='apache', tandem=type==='citabria';
  const length=type==='150'?72:tandem?67:75;
  const wingY=twin?4:-7;
  return <g className={`aircraft-vector paint-${reg.toLowerCase()}${shadow?' aircraft-shadow':''}`} transform="scale(.01)">
    <path className="aircraft-base" d={`M-50 ${wingY-4} L-47 ${wingY-8} L-6 ${wingY-10} L6 ${wingY-10} L47 ${wingY-8} L50 ${wingY-4} L49 ${wingY+4} L8 ${wingY+6} L-8 ${wingY+6} L-49 ${wingY+4} Z`} />
    <path className="aircraft-stripe" d={`M-49 ${wingY+1} L49 ${wingY+1} L49 ${wingY+4} L-49 ${wingY+4} Z`} />
    <path className="aircraft-base" d={`M0 ${-length/2} C-4 ${-length/2} -6 -24 -5 -12 L-3 16 L-2 ${length/2} L2 ${length/2} L3 16 L5 -12 C6 -24 4 ${-length/2} 0 ${-length/2}Z`} />
    <path className="aircraft-stripe" d={`M-3 -25 L-2 ${length/2} L0 ${length/2-2} L0 -26 Z`} />
    {reg==='N8570B'&&<><path className="aircraft-stripe" d={`M-5 -26 L5 -26 L4 ${-length/2+1} L-4 ${-length/2+1}Z M-50 ${wingY-4}h6v8h-6z M44 ${wingY-4}h6v8h-6z M-2 ${length/2-12}h4v8h-4z`}/><path className="aircraft-tan" d={`M-3 -25h.6v${length/2+25}h-.6z`}/><text className="aircraft-lettering" transform="translate(-1 7) rotate(90)">N8570B</text></>}
    {twin&&<><path className="aircraft-maroon" d={`M-2 -25h1v${length/2+25}h-1z M-47 ${wingY-6}h2v12h-2z M45 ${wingY-6}h2v12h-2z`}/><path className="aircraft-black" d={`M-1 -25h1v${length/2+25}h-1z M-45 ${wingY-6}h1v12h-1z M44 ${wingY-6}h1v12h-1z`}/><path className="aircraft-stripe" d={`M-49 ${wingY-6}h2v12h-2z M47 ${wingY-6}h2v12h-2z M0 ${length/2-14}h1v11h-1z`}/><path className="aircraft-maroon" d={`M1 ${length/2-14}h.7v12H1z`}/><path className="aircraft-black" d={`M1.7 ${length/2-14}h.5v13h-.5z`}/></>}
    <path className="aircraft-base" d={`M-17 ${length/2-8} L-3 ${length/2-12} L3 ${length/2-12} L17 ${length/2-8} L16 ${length/2-3} L-16 ${length/2-3} Z`} />
    <path className="aircraft-stripe" d={`M-16 ${length/2-5} L16 ${length/2-5} L16 ${length/2-3} L-16 ${length/2-3} Z`} />
    {reg==='N46201'&&<>
      <path className="aircraft-stripe" d={`M0 ${-length/2}C-4 ${-length/2} -6 -24 -5 -12L-3 16L-2 ${length/2}H2L3 16L5 -12C6 -24 4 ${-length/2} 0 ${-length/2}Z M-50 ${wingY-4}h6v8h-6z M44 ${wingY-4}h6v8h-6z M-9 ${wingY-8}h18v14H-9z M-17 ${length/2-8}h4v5h-4z M13 ${length/2-8}h4v5h-4z`}/>
      <path className="aircraft-base" d={`M-3 -26h.55v55h-.55z M2.45 -26H3v55h-.55z M-49 ${wingY-1}h4v.6h-4z M45 ${wingY-1}h4v.6h-4z M-3 0Q-2 7 0 10Q2 7 3 0L2 11H-2Z`}/>
      <path className="aircraft-base" d={`M-1 ${length/2-15}h2v14h-2z`}/>
      <path className="aircraft-stripe" d={`M-1 ${length/2-12}l2 2v1l-2-2z M-1 ${length/2-8}l2 2v1l-2-2z M-1 ${length/2-4}l2 2v1l-2-2z`}/>
      <path className="aircraft-black" d={`M-10 ${-length/2}h20v1H-10z`}/><path className="aircraft-base" d={`M-10 ${-length/2}h2v1h-2z M8 ${-length/2}h2v1H8z`}/><path className="aircraft-stripe" d={`M-1 ${-length/2}L0 ${-length/2-3}L1 ${-length/2}Z`}/>
    </>}
    <path className="aircraft-glass" d={tandem?'M-2 -22 L2 -22 L2 -3 L-2 -3 Z':'M-4 -23 L4 -23 L4 -13 L-4 -13 Z'} />
    {tandem&&<path className="aircraft-detail" d="M-2 -12H2"/>}
    {!twin&&<><path className="aircraft-detail" d={`M-10 ${-length/2+1}H10 M-3 8L-19 ${wingY+5} M3 8L19 ${wingY+5}`}/><path className="aircraft-gear" d="M-7 7h2v5h-2z M5 7h2v5H5z"/></>}
    {twin&&[-20,20].map(x=><g key={x}><path className="aircraft-base" d={`M${x-4} -23 Q${x} -29 ${x+4} -23 L${x+3} 12 Q${x} 17 ${x-3} 12 Z`}/><path className="aircraft-stripe" d={`M${x-3} -23H${x+3}V-20H${x-3}Z`}/><path className="aircraft-maroon" d={`M${x-3} -20h6v1h-6z`}/><path className="aircraft-black" d={`M${x-3} -19h6v1h-6z`}/><path className="aircraft-detail" d={`M${x-11} -24H${x+11}`}/><ellipse className="aircraft-chrome" cx={x} cy={-25} rx={1.5} ry={3}/></g>)}
  </g>;
}