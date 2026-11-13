// Real-time 3D airplanes for the top-down airport maps. Browser only: loaded lazily
// by MapModelsLayer after the owner setting (map_3d_models) is known. It never moves
// anything itself: each frame it reads the existing SVG airplane group's matrix
// (position, heading, wingspan in px) and draws the model there, banking in turns.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { bankFor, mapModelUrl } from '../lib/map-models';

type Prepared = { scene: THREE.Object3D; span: number };
const cache = new Map<string, Promise<Prepared | null>>();
const HIDDEN_PARTS = new Set(['interior_wall', 'interior_floor', 'interior_dark', 'seat', 'panel', 'duct']);

function loadModel(reg: string) {
  let p = cache.get(reg);
  if (p) return p;
  const url = mapModelUrl(reg);
  p = !url ? Promise.resolve(null) : new Promise<Prepared | null>((resolve) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(url, (gltf) => {
      const model = gltf.scene;
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (HIDDEN_PARTS.has(mat.name)) { mesh.visible = false; return; }
        if (mat.name === 'glass') {
          // Transmission needs an extra render pass; tinted glass reads the same at map size.
          mesh.material = new THREE.MeshStandardMaterial({ name: 'glass', color: 0x2b3a46, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 });
        } else if (mat.name === 'navred' || mat.name === 'navgreen' || mat.name === 'navwhite') {
          mat.emissive = mat.color.clone(); mat.emissiveIntensity = 1.6;
        } else if (mat.name === 'beacon') {
          mesh.material = mat.clone(); (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xff2a1a);
          mesh.userData['beacon'] = true;
        }
      });
      // Models are nose +Z, up +Y. Map world: camera looks down -Z, +Y is north (screen up).
      const orient = new THREE.Group(); orient.rotation.x = Math.PI / 2; orient.add(model);
      const holder = new THREE.Group(); holder.rotation.z = Math.PI; holder.add(orient);
      const box2 = new THREE.Box3().setFromObject(holder), c2 = box2.getCenter(new THREE.Vector3());
      holder.position.set(-c2.x, -c2.y, -c2.z);
      const root = new THREE.Group(); root.add(holder);
      resolve({ scene: root, span: box2.getSize(new THREE.Vector3()).x || 1 });
    }, undefined, () => resolve(null));
  });
  cache.set(reg, p);
  return p;
}
/** Download and decode these airplanes now (the map is near), so they are ready before the map is on screen. */
export function warmMapModels(regs: Iterable<string>) { for (const r of regs) void loadModel(r); }
/** How long a modeled airplane may stay hidden waiting for its model before the flat art is shown instead. */
const MODEL_WAIT_MS = 10000;

type Plane = { yaw: THREE.Group; bank: THREE.Group; scale: number; lastHdg: number; lastT: number; roll: number; beacons: THREE.MeshStandardMaterial[] };

export default function MapModels3D({ svgRef, regs, active }: { svgRef: React.RefObject<SVGSVGElement | null>; regs: ReadonlySet<string>; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  // Started once (active stage or a neighbour) and kept while mounted: leaving a stage pauses drawing
  // instead of rebuilding the renderer, so coming back never waits for the airplanes again.
  useEffect(() => {
    const canvas = canvasRef.current, svg = svgRef.current;
    if (!canvas || !svg || regs.size === 0) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; scene.environmentIntensity = 0.55;
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(-0.45, -0.6, 1); scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x5a5040, 0.7));
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000); camera.position.z = 1000;
    let w = 0, h = 0;
    const resize = () => {
      const r = svg.getBoundingClientRect(); w = svg.clientWidth || r.width; h = svg.clientHeight || r.height;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(svg);

    const planes = new Map<SVGGElement, Plane>();
    const pending = new Set<SVGGElement>();
    let dead = false, raf = 0, lost = false;
    const host = svg.closest('[data-journey-section]');
    const layer = svg.closest<HTMLElement>('.journey-layer');
    // A neighbouring stage draws only while its layer is actually showing (crossfade or story turn).
    const showing = () => activeRef.current || !layer || (layer.style.visibility !== 'hidden' && layer.style.opacity !== '0' && layer.style.opacity !== '');
    const fineCompile = window.matchMedia('(pointer: fine)').matches;
    const attach = (g: SVGGElement, reg: string) => {
      if (pending.has(g)) return; pending.add(g);
      // With map 3D on, this airplane is only ever shown as its model: hide the flat art while the model
      // gets ready, and fall back to it only if the model fails or is very slow.
      g.setAttribute('data-model3d', '');
      const giveUp = window.setTimeout(() => { if (!planes.has(g)) g.removeAttribute('data-model3d'); }, MODEL_WAIT_MS);
      void loadModel(reg).then((m) => {
        if (dead) return;
        if (!m || !g.isConnected) { window.clearTimeout(giveUp); g.removeAttribute('data-model3d'); return; }
        const model = m.scene.clone(true);
        const beacons: THREE.MeshStandardMaterial[] = [];
        model.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh && mesh.userData['beacon']) { const mat = (mesh.material as THREE.MeshStandardMaterial).clone(); mesh.material = mat; beacons.push(mat); } });
        const bank = new THREE.Group(); bank.add(model);
        const yaw = new THREE.Group(); yaw.add(bank); yaw.visible = false; scene.add(yaw);
        const add = () => { window.clearTimeout(giveUp); if (!dead) planes.set(g, { yaw, bank, scale: 1 / m.span, lastHdg: NaN, lastT: 0, roll: 0, beacons }); };
        // Computers: compile this airplane's shaders off the main thread first (parallel compile), so its first
        // frame never stalls a scroll. Phones keep drawing it straight away.
        if (!fineCompile) { add(); return; }
        yaw.visible = true;
        const compiled = renderer.compileAsync(yaw, camera, scene);
        yaw.visible = false;
        void compiled.then(add, add);
      });
    };
    let lastScan = -Infinity;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (lost || document.hidden) return;
      const onScreen = !host?.hasAttribute('data-offstage') && showing();
      // Off screen: keep preparing airplanes (a few checks a second) so they are ready on arrival.
      if (onScreen || t - lastScan > 400) {
        lastScan = t;
        for (const g of svg.querySelectorAll<SVGGElement>('[data-aircraft]')) {
          const reg = g.getAttribute('data-aircraft') ?? '';
          if (regs.has(reg) && !pending.has(g)) attach(g, reg);
        }
      }
      if (!onScreen) return;
      if (!w || !h) resize();
      for (const [g, p] of planes) {
        const sim = g.closest('.traffic-sim') as SVGGElement | null;
        const m = g.isConnected && !(sim && sim.style.display === 'none') ? g.getCTM() : null;
        const span = m ? Math.hypot(m.a, m.b) : 0;
        if (!m || span < 0.5) { p.yaw.visible = false; if (!g.isConnected) { scene.remove(p.yaw); planes.delete(g); } continue; }
        const hdg = Math.atan2(m.b, m.a) * 180 / Math.PI;
        if (Number.isFinite(p.lastHdg) && t > p.lastT) {
          let d = hdg - p.lastHdg; d = ((d + 540) % 360) - 180;
          const dt = Math.min(0.25, (t - p.lastT) / 1000);
          const target = Math.abs(d) > 45 ? p.roll : bankFor(d / dt);
          p.roll += (target - p.roll) * Math.min(1, dt / 0.45);
        }
        p.lastHdg = hdg; p.lastT = t;
        p.yaw.position.set(m.e, -m.f, 0);
        p.yaw.rotation.z = -hdg * Math.PI / 180;
        p.bank.rotation.y = p.roll;
        p.yaw.scale.setScalar(span * p.scale);
        p.yaw.visible = true;
        // Anti-collision beacon: short red flash once a second.
        const on = (t % 1000) < 120;
        for (const b of p.beacons) b.emissiveIntensity = on ? 4 : 0;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(draw);
    const onLost = (e: Event) => { e.preventDefault(); lost = true; for (const g of pending) g.removeAttribute('data-model3d'); };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const g of pending) g.removeAttribute('data-model3d');
      for (const p of planes.values()) for (const b of p.beacons) b.dispose();
      env.dispose(); pmrem.dispose(); renderer.dispose();
    };
  }, [svgRef, regs]);
  return <canvas ref={canvasRef} aria-hidden className="map-models-3d pointer-events-none absolute inset-0 h-full w-full" />;
}
