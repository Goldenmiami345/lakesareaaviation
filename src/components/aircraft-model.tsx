import { createElement, useEffect, useRef, useState } from 'react';
import { MODEL_SETTINGS, MODEL_RESUME_MS, modelOrbitRadius } from '../lib/model-settings';
import { useShow3DModels } from '../lib/use-site-settings';

type Viewer = HTMLElement & {
  loaded: boolean;
  getDimensions: () => { x: number; y: number; z: number };
  getCameraOrbit: () => { radius: number };
  getFieldOfView: () => number;
  jumpCameraToGoal: () => void;
  resetTurntableRotation?: () => void;
};

export default function AircraftModel({ src, label, poster, autoRotate = true, onLoad }: { src: string; label: string; poster?: string; autoRotate?: boolean; onLoad?: () => void }) {
  const enabled = useShow3DModels();
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const loadCallback=useRef(onLoad);
  useEffect(()=>{loadCallback.current=onLoad;},[onLoad]);
  useEffect(() => {
    const node=ref.current;if(!ready||!node)return;
    const el=node as Viewer;
    let resumeTimer=0, down=false, lastTap=0;
    let sphere=0, homeOrbit=MODEL_SETTINGS['camera-orbit'] as string;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fit=()=>{
      if(!sphere)return;
      const {width,height}=el.getBoundingClientRect();if(!width||!height)return;
      const dimensions=el.getDimensions();
      // These nose +Z aircraft are widest across X. Tighten the horizontal
      // rotational envelope to their span, retaining the mesh sphere as its cap.
      const radius=modelOrbitRadius(Math.min(sphere,dimensions.x/2),dimensions.y,width/height,el.getFieldOfView());
      homeOrbit=`35deg 73deg ${radius}m`;
      el.setAttribute('camera-orbit',homeOrbit);
      el.jumpCameraToGoal();
    };
    const loaded=()=>{
      if(!sphere){
        // The initial auto orbit is 105% of R/sin(half framed FOV).
        // Recover the tight mesh-derived sphere using public viewer APIs only.
        sphere=el.getCameraOrbit().radius/1.05*Math.sin(30*Math.PI/360);
        fit();
      }
      el.dataset['modelLoaded']='true';loadCallback.current?.();
    };
    el.addEventListener('load',loaded);
    if(el.loaded)loaded();
    const resize=new ResizeObserver(()=>fit());resize.observe(el);
    const pause=()=>{window.clearTimeout(resumeTimer);el.removeAttribute('auto-rotate');};
    // Only spin (and so only render frames) while the model is on screen and the tab is visible.
    let inView=false;
    const canSpin=()=>autoRotate&&!reduce&&!down&&inView&&!document.hidden;
    const resume=()=>{window.clearTimeout(resumeTimer);if(canSpin())resumeTimer=window.setTimeout(()=>{if(canSpin())el.setAttribute('auto-rotate','');},MODEL_RESUME_MS);};
    const start=()=>{down=true;pause();};
    const end=()=>{down=false;resume();};
    const change=(e:Event)=>{if((e as CustomEvent<{source:string}>).detail?.source==='user-interaction'){pause();resume();}};
    const reset=()=>{el.setAttribute('camera-orbit',homeOrbit);el.setAttribute('field-of-view',MODEL_SETTINGS['field-of-view']);el.resetTurntableRotation?.();pause();resume();};
    const tap=(e:PointerEvent)=>{if(e.pointerType==='mouse')return;const now=performance.now();if(now-lastTap<300)reset();lastTap=now;};
    pause();
    const sync=()=>{if(canSpin()){window.clearTimeout(resumeTimer);el.setAttribute('auto-rotate','');}else pause();};
    const view=new IntersectionObserver(([e])=>{inView=!!e?.isIntersecting;sync();});view.observe(el);
    document.addEventListener('visibilitychange',sync);
    el.addEventListener('pointerdown',start);el.addEventListener('pointerup',tap);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
    el.addEventListener('camera-change',change);el.addEventListener('dblclick',reset);
    return()=>{resize.disconnect();view.disconnect();document.removeEventListener('visibilitychange',sync);window.clearTimeout(resumeTimer);el.removeEventListener('load',loaded);el.removeEventListener('pointerdown',start);el.removeEventListener('pointerup',tap);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);el.removeEventListener('camera-change',change);el.removeEventListener('dblclick',reset);};
  },[ready,autoRotate]);
  useEffect(() => {
    // The SSR guard removes model-viewer from the server bundle entirely. Without it the
    // production bundler merged model-viewer (top-level `class extends HTMLElement`) into a
    // shared chunk with the `performance` polyfill used by the site layout, so every
    // SiteShell page threw "HTMLElement is not defined" during server rendering.
    if (import.meta.env.SSR || !enabled) return;
    let alive = true;
    void import('@google/model-viewer')
      .then(async ({ ModelViewerElement }) => {
        // public/models/*.glb are meshopt-compressed (gltfpack -cc) and model-viewer ships no
        // decoder, so every load failed with "THREE.GLTFLoader: setMeshoptDecoder must be
        // called before loading compressed files". The decoder is self-hosted (no CDN).
        // model-viewer pulls it in with a classic <script> tag, and Vite refuses to let a
        // module import a JS file out of public/, so the warm-up is a plain fetch.
        try {
          await fetch('/models/meshopt_decoder.js');
          ModelViewerElement.meshoptDecoderLocation = '/models/meshopt_decoder.js';
        } catch {
          // Decoder unavailable: still mount so the photo poster shows instead of a blank.
        }
        if (alive) setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [enabled]);
  return enabled && ready ? createElement('model-viewer', { ...MODEL_SETTINGS, ref, src, alt: label, poster,  className: 'aircraft-model relative h-full w-full' }) : null;
}