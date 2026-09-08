import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sampledField, typographyCanvas } from './memoryField';
import { clampZoom, focusFactor, planetScale, projectFling, snapIndex, springSettled, stepSpring, type SpringState } from './orbitMotion';
import { keywordsOf, type WeightedKeyword } from '../../services/memoryArt';
import type { JournalEntry } from '../../types';

export type PlanetMotion = 'idle' | 'enter' | 'exit' | 'dive' | 'return' | 'detail';

interface Props {
  entries: JournalEntry[];
  index: number;
  getImage: (entry: JournalEntry) => string | undefined;
  getKeywords: (entry: JournalEntry) => WeightedKeyword[];
  getSeed: (entry: JournalEntry) => number;
  motion?: PlanetMotion;
  active?: boolean;
  /** Bump to hard-snap the track onto `index` (create / archive jumps). */
  snap?: number;
  onSettle?: (index: number) => void;
  onMoving?: (moving: boolean) => void;
  onActivate?: () => void;
}

const vertex = `
  attribute float aEdge; attribute float aPhase; attribute float aAlpha;
  uniform float uTime; uniform float uDive; uniform float uSize; uniform float uFocus;
  varying vec3 vColor; varying float vAlpha; varying float vEdge; varying float vFocus;
  void main() {
    vec3 p=position;
    float wind=sin(p.y*4.2+uTime*.48)+.35*sin(p.x*5.1-p.y*2.0+uTime*.27);
    p.x+=wind*aEdge*.019;
    p.y+=sin(p.x*3.6+uTime*.32)*aEdge*.012;
    p.z+=sin(p.y*3.0+p.x*2.5+uTime*.4)*(.005+aEdge*.017);
    vec2 radial=normalize(p.xy+vec2(.001));
    p.xy+=radial*uDive*uDive*(.15+aPhase*.8);
    p.z+=uDive*(.3+aPhase*.8);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(uSize*(1.0-aEdge*.15)*(5.0/max(1.0,-mv.z)),.7,3.2);
    vColor=color; vEdge=aEdge;
    vAlpha=aAlpha*(1.0-smoothstep(.4,1.0,uDive));
    vFocus=uFocus;
  }
`;
const fragment = `
  varying vec3 vColor; varying float vAlpha; varying float vEdge; varying float vFocus;
  void main() {
    vec2 q=gl_PointCoord-.5;
    float footprint=1.0-smoothstep(.31,.5,length(q));
    // vFocus: 1 at the centre (full brightness); neighbours sit at ~.55 and
    // ramp to 0 during the dive so the editor emerges from the centre alone.
    float alpha=footprint*vAlpha*mix(.72,1.0,vFocus)*smoothstep(.0,.2,vFocus);
    if(alpha<.015)discard;
    gl_FragColor=vec4(vColor*mix(.52,1.0,vFocus)*(.83+vEdge*.12),alpha);
    #include <colorspace_fragment>
  }
`;

const SPACING = 1.62;   // world units between neighbouring planets
const ARC = .3;         // neighbours pull back on a shallow arc
const REACH = 2;        // entries kept alive this far around the track centre
const MAX_OBJECTS = 6;
const PLACEHOLDER = '__inmind_placeholder__';

type OrbitObject = { points: THREE.Points; material: THREE.ShaderMaterial; entryId: string };

export function Orbit({ entries, index, getImage, getKeywords, getSeed, motion = 'idle', active = true, snap = 0, onSettle, onMoving, onActivate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const motionRef = useRef(motion); motionRef.current = motion;
  const activeRef = useRef(active); activeRef.current = active;
  const reduced = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [error, setError] = useState(false);
  const [centerReady, setCenterReady] = useState(false);
  // Everything the render loop needs is mirrored here: the scene is built once
  // and never rebuilt because of a prop change.
  const state = useRef({ entries, index, onSettle, onMoving, onActivate, getImage, getKeywords, getSeed });
  state.current = { entries, index, onSettle, onMoving, onActivate, getImage, getKeywords, getSeed };
  // Track + zoom live in refs so position and zoom survive detail round-trips.
  const targetIndex = useRef(0);
  const spring = useRef<SpringState>({ offset: 0, velocity: 0 });
  const zoom = useRef(1), zoomTarget = useRef(1);
  const settled = useRef(true);

  useEffect(() => {
    // External selection changes (arrows, archive, create) glide the track.
    const count = state.current.entries.length;
    const next = count ? Math.min(Math.max(index, 0), count - 1) : 0;
    if (next !== targetIndex.current) { targetIndex.current = next; settled.current = false; }
  }, [index]);

  useEffect(() => {
    // Hard snap (create / archive jump straight into detail): no glide, no blank.
    const count = state.current.entries.length;
    const next = count ? Math.min(Math.max(state.current.index, 0), count - 1) : 0;
    targetIndex.current = next;
    spring.current = { offset: next, velocity: 0 };
    settled.current = true;
  }, [snap]);

  useEffect(() => {
    const mount = host.current; if (!mount) return;
    setError(false); setCenterReady(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' }); }
    catch { setError(true); return; }
    const mobile = matchMedia('(max-width:760px)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.2 : 1.5));
    renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const emptyGeometry = new THREE.BufferGeometry();
    emptyGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    const makeMaterial = () => new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uDive: { value: 0 }, uSize: { value: 1.3 }, uFocus: { value: 1 } },
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    const allObjects: OrbitObject[] = [];
    const objects = new Map<string, OrbitObject>();   // entryId → on-stage object
    const freeObjects: OrbitObject[] = [];
    const createObject = (): OrbitObject => {
      const material = makeMaterial();
      const points = new THREE.Points(emptyGeometry, material);
      points.frustumCulled = true;
      scene.add(points);
      const obj: OrbitObject = { points, material, entryId: '' };
      allObjects.push(obj);
      return obj;
    };
    const attach = (obj: OrbitObject, geometry: THREE.BufferGeometry) => {
      obj.points.geometry = geometry;
      obj.points.visible = geometry !== emptyGeometry;
    };

    // ---- geometry cache + serialized idle builds -----------------------------
    const cache = new Map<string, { geometry: THREE.BufferGeometry; version: string }>();
    const pending = new Set<string>();
    let queue: { key: string; priority: number; run: () => void }[] = [];
    let building = false;
    let dead = false, frame = 0, last = 0, elapsed = 0, dive = 0, visible = true, baseDistance = 5;
    let readyFlag = false, lastVersionCheck = 0;
    let indexById = new Map<string, number>();
    let lastEntries: JournalEntry[] | null = null;

    const idleRun = (fn: () => void) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(() => { if (!dead) fn(); }, { timeout: 900 });
      else window.setTimeout(() => { if (!dead) fn(); }, 80);
    };
    const pump = () => {
      if (dead || building || !queue.length) return;
      building = true;
      const task = queue.sort((a, b) => a.priority - b.priority).shift()!;
      idleRun(() => { if (dead) { building = false; return; } task.run(); });
    };
    const taskDone = () => { building = false; pump(); };
    const versionOf = (entry: JournalEntry) => `${entry.updatedAt}|${state.current.getImage(entry) ?? ''}|${state.current.getSeed(entry)}`;

    const startBuild = (entry: JournalEntry | null, key: string, version: string, priority: number) => {
      if (pending.has(key)) return;
      pending.add(key);
      queue.push({
        key, priority, run: () => {
          const finish = (canvas: HTMLCanvasElement, text: boolean) => {
            if (dead) { pending.delete(key); taskDone(); return; }
            const seed = entry ? state.current.getSeed(entry) : 1335;
            const geometry = sampledField(canvas, seed, text, mobile);
            // Pad the bounds so the vertex shader's wind/dive displacement never
            // lets a visible planet get frustum-culled at the edge.
            geometry.computeBoundingSphere();
            if (geometry.boundingSphere) geometry.boundingSphere.radius *= 1.6;
            const previous = cache.get(key);
            cache.set(key, { geometry, version });
            pending.delete(key);
            const obj = objects.get(key);
            if (obj) attach(obj, geometry);   // live swap: the old field stays until this line
            refreshReady();
            if (previous && previous.geometry !== geometry) previous.geometry.dispose();
            taskDone();
          };
          const image = entry ? state.current.getImage(entry) : undefined;
          if (!image) {
            finish(typographyCanvas(entry ? state.current.getKeywords(entry) : keywordsOf(), entry ? state.current.getSeed(entry) : 1335), true);
            return;
          }
          const source = new Image(); source.crossOrigin = 'anonymous';
          source.onload = () => {
            if (dead) { pending.delete(key); taskDone(); return; }
            const aspect = source.naturalWidth / source.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(2, Math.round(aspect >= 1 ? 760 : 760 * aspect));
            canvas.height = Math.max(2, Math.round(aspect >= 1 ? 760 / aspect : 760));
            const ctx = canvas.getContext('2d');
            if (!ctx) { pending.delete(key); taskDone(); return; }
            ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
            idleRun(() => finish(canvas, false));   // heavy sampling stays off the input path
          };
          source.onerror = () => { pending.delete(key); taskDone(); };
          source.src = image;
        },
      });
      pump();
    };

    const refreshReady = () => {
      const list = state.current.entries;
      const center = list.length
        ? list[Math.min(Math.max(Math.round(spring.current.offset), 0), list.length - 1)]?.id
        : PLACEHOLDER;
      const obj = center ? objects.get(center) : undefined;
      const ready = !!obj && obj.points.geometry !== emptyGeometry;
      if (ready !== readyFlag) { readyFlag = ready; setCenterReady(ready); }
    };

    const pruneCache = (centerIndex: number) => {
      const list = state.current.entries;
      const keep = new Set<string>();
      if (list.length) for (let off = -REACH; off <= REACH; off++) {
        const idx = centerIndex + off;
        if (idx >= 0 && idx < list.length) keep.add(list[idx].id);
      } else keep.add(PLACEHOLDER);
      cache.forEach((value, key) => { if (!keep.has(key)) { cache.delete(key); value.geometry.dispose(); } });
    };

    const releaseObject = (id: string) => {
      const obj = objects.get(id);
      if (!obj) return;
      objects.delete(id);
      attach(obj, emptyGeometry);
      freeObjects.push(obj);
    };

    const ensureObject = (entry: JournalEntry) => {
      const id = entry.id;
      if (objects.has(id)) return;
      let obj = freeObjects.pop();
      if (!obj) { if (objects.size >= MAX_OBJECTS) return; obj = createObject(); }
      obj.entryId = id;
      objects.set(id, obj);
      const cached = cache.get(id);
      const version = versionOf(entry);
      if (cached && cached.version === version) attach(obj, cached.geometry);
      else { attach(obj, emptyGeometry); startBuild(entry, id, version, 0); }
    };

    // ---- input ----------------------------------------------------------------
    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false, movedPx = 0, lastX = 0, lastT = 0, trackVel = 0;
    let pinch: { dist: number; zoom: number } | null = null;
    let lastTap = { time: 0, x: 0, y: 0 };
    const worldPerPx = () => (2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.z * camera.aspect) / Math.max(1, mount.clientWidth);
    const motionLocked = () => motionRef.current === 'dive' || motionRef.current === 'detail' || motionRef.current === 'return';

    const down = (e: PointerEvent) => {
      if (!activeRef.current || motionLocked()) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomTarget.current };
        dragging = false; movedPx = 999;   // a second finger always cancels the drag/click
        return;
      }
      dragging = false; movedPx = 0; trackVel = 0;
      lastX = e.clientX; lastT = performance.now();
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
    };
    const move = (e: PointerEvent) => {
      const point = pointers.get(e.pointerId);
      if (!point) return;
      point.x = e.clientX; point.y = e.clientY;
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > 8 && pinch.dist > 8) zoomTarget.current = clampZoom(pinch.zoom * dist / pinch.dist);
        return;
      }
      const dx = e.clientX - lastX;
      if (!dragging && Math.abs(e.clientX - lastX) + movedPx > 5) dragging = true;
      if (!dragging) return;
      const now = performance.now();
      const dtSec = Math.max(.008, (now - lastT) / 1000);
      const dOffset = -(dx * worldPerPx()) / SPACING;
      lastX = e.clientX; lastT = now;
      movedPx += Math.abs(dx);
      const count = state.current.entries.length;
      const bound = count ? .8 : 0;
      spring.current.offset = Math.min(count - 1 + bound, Math.max(-bound, spring.current.offset + dOffset));
      trackVel = trackVel * .7 + (dOffset / dtSec) * .3;
      if (movedPx > 6) { settled.current = false; state.current.onMoving?.(true); }
    };
    const up = (e: PointerEvent) => {
      const had = pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) {
        // One finger left a pinch: rebase the drag origin so the surviving
        // finger cannot teleport the track with a stale lastX.
        pinch = null;
        const rest = [...pointers.values()][0];
        if (rest) { lastX = rest.x; lastT = performance.now(); }
        movedPx = 999; dragging = false;
        return;
      }
      if (!had || !activeRef.current || motionLocked()) return;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const count = state.current.entries.length;
      if (movedPx < 7) {
        const now = performance.now();
        const nearTap = now - lastTap.time < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 32;
        lastTap = { time: now, x: e.clientX, y: e.clientY };
        if (nearTap) { zoomTarget.current = 1; return; }   // double tap/click restores the default view
        if (!count) return;
        // Hit test in world space: which planet was tapped?
        const box = mount.getBoundingClientRect();
        const worldHalfH = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
        const worldX = ((e.clientX - box.left) / box.width * 2 - 1) * worldHalfH * camera.aspect;
        const worldY = -(((e.clientY - box.top) / box.height) * 2 - 1) * worldHalfH;
        const hitFloat = spring.current.offset + worldX / SPACING;
        const hitIndex = Math.round(hitFloat);
        const target = count ? state.current.entries[hitIndex] : undefined;
        if (target && objects.has(target.id)
          && Math.abs(worldX - (hitIndex - spring.current.offset) * SPACING) < 1.1
          && Math.abs(worldY) < 1.15) {
          if (hitIndex === Math.round(spring.current.offset)) state.current.onActivate?.();
          else { targetIndex.current = hitIndex; settled.current = false; }
        }
        return;
      }
      if (dragging) {
        targetIndex.current = snapIndex(projectFling(spring.current.offset, trackVel), count);
        settled.current = false;
        dragging = false;
      }
    };
    const wheel = (e: WheelEvent) => {
      if (!activeRef.current || motionLocked()) return;
      e.preventDefault();
      zoomTarget.current = clampZoom(zoomTarget.current * Math.exp(-e.deltaY * .0011));
    };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; dragging = false; });
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });

    // ---- sizing / visibility ---------------------------------------------------
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      baseDistance = Math.max(4.85, 3.65 / camera.aspect);
      camera.updateProjectionMatrix();
      const size = Math.max(1.05, Math.min(2.15, h * renderer.getPixelRatio() / 630));
      allObjects.forEach(obj => { obj.material.uniforms.uSize.value = size; });
    };
    const ro = new ResizeObserver(resize); ro.observe(mount); resize();
    const io = new IntersectionObserver(items => { visible = items[0]?.isIntersecting ?? true; }); io.observe(mount);

    // ---- frame loop --------------------------------------------------------------
    const animate = (time: number) => {
      if (dead) return;
      frame = requestAnimationFrame(animate);
      const busy = !settled.current || Math.abs(zoom.current - zoomTarget.current) > .001 || dive > .01;
      if (!visible || document.hidden || !activeRef.current) { last = time; return; }
      if (time - last < 1000 / (busy ? 60 : 45)) return;
      const dt = Math.min((time - last) / 1000, .04); last = time;

      const list = state.current.entries;
      const count = list.length;
      if (count && lastEntries !== list) { lastEntries = list; indexById = new Map(list.map((entry, i) => [entry.id, i])); }

      // Zoom: smooth interpolation of the camera distance; never switches records.
      zoom.current += (zoomTarget.current - zoom.current) * (1 - Math.exp(-dt * 9));
      camera.position.z = baseDistance / zoom.current;

      // Dive (detail open/close) bends only the central planet.
      const goal = motionRef.current === 'dive' || motionRef.current === 'detail' ? 1 : 0;
      dive = reduced.current ? goal : dive + (goal - dive) * (1 - Math.exp(-dt * 4.8));

      // Track spring: external targets and flings merge here, mid-flight included.
      if (!dragging) {
        if (count) targetIndex.current = Math.min(count - 1, Math.max(0, targetIndex.current));
        const stepped = stepSpring(spring.current, targetIndex.current, dt);
        spring.current = stepped;
        if (springSettled(stepped, targetIndex.current)) {
          spring.current = { offset: targetIndex.current, velocity: 0 };
          if (!settled.current) {
            settled.current = true;
            const settledIndex = Math.round(targetIndex.current);
            if (count && settledIndex !== state.current.index) state.current.onSettle?.(settledIndex);
            state.current.onMoving?.(false);
          }
        } else if (settled.current) settled.current = false;
      }

      // Object pool: keep ±REACH around the track centre alive, release the rest.
      const centerIndex = Math.round(spring.current.offset);
      if (count) {
        for (let off = -REACH; off <= REACH; off++) {
          const idx = centerIndex + off;
          if (idx >= 0 && idx < count) ensureObject(list[idx]);
        }
        for (const id of [...objects.keys()]) {
          const entryIndex = indexById.get(id);
          if (entryIndex === undefined || Math.abs(entryIndex - spring.current.offset) > REACH + .8) releaseObject(id);
        }
        if (objects.has(PLACEHOLDER)) releaseObject(PLACEHOLDER);
      } else if (!objects.has(PLACEHOLDER)) {
        const obj = freeObjects.pop() ?? (objects.size < MAX_OBJECTS ? createObject() : null);
        if (obj) {
          obj.entryId = PLACEHOLDER;
          objects.set(PLACEHOLDER, obj);
          const cached = cache.get(PLACEHOLDER);
          if (cached) attach(obj, cached.geometry);
          else { attach(obj, emptyGeometry); startBuild(null, PLACEHOLDER, 'v1', 0); }
        }
      }

      // Layout: every planet's world position derives from the continuous track,
      // so switching is one uninterrupted camera glide, never a page flip.
      if (!reduced.current) elapsed += dt;
      for (const obj of objects.values()) {
        const entryIndex = obj.entryId === PLACEHOLDER ? 0 : indexById.get(obj.entryId);
        if (entryIndex === undefined || (!count && obj.entryId !== PLACEHOLDER)) { obj.points.visible = false; continue; }
        const o = entryIndex - spring.current.offset;
        const isCenter = count ? entryIndex === centerIndex : true;
        const scale = planetScale(o) * (isCenter ? 1 + dive * .55 : 1);
        obj.points.position.set(o * SPACING, -.045 * o * o, -ARC * o * o + (isCenter ? dive * .6 : 0));
        obj.points.scale.setScalar(scale);
        obj.points.rotation.y = Math.sin(elapsed * .19 + entryIndex * 1.7) * .065;
        obj.points.visible = obj.points.geometry !== emptyGeometry;
        obj.material.uniforms.uTime.value = elapsed;
        obj.material.uniforms.uDive.value = isCenter ? dive : 0;
        obj.material.uniforms.uFocus.value = focusFactor(o) * (isCenter ? 1 : 1 - dive);
      }

      // Rebuild edited neighbours: geometry swaps in place, never a blank.
      if (time - lastVersionCheck > 900 && count) {
        lastVersionCheck = time;
        for (let off = -REACH; off <= REACH; off++) {
          const idx = centerIndex + off;
          if (idx < 0 || idx >= count) continue;
          const entry = list[idx];
          if (cache.get(entry.id)?.version !== versionOf(entry)) startBuild(entry, entry.id, versionOf(entry), Math.abs(off));
        }
        pruneCache(centerIndex);
        refreshReady();
      }

      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);

    const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(frame); setError(true); };
    const restored = () => { if (dead) return; setError(false); last = 0; resize(); frame = requestAnimationFrame(animate); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    renderer.domElement.addEventListener('webglcontextrestored', restored);

    return () => {
      dead = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      cache.forEach(value => value.geometry.dispose()); cache.clear();
      allObjects.forEach(obj => { scene.remove(obj.points); obj.material.dispose(); });
      emptyGeometry.dispose();
      renderer.dispose();
      // Release the GL context immediately instead of waiting for GC.
      renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);

  return <div className={`planet-stage orbit-stage ${centerReady ? 'field-ready' : ''}`}>
    <div ref={host} className="planet-canvas" role="img"
      aria-label="记忆星球轨道：拖动切换星球，滚轮或双指缩放，点击中央星球打开日记"
      style={{ visibility: error ? 'hidden' : 'visible' }} />
    {!centerReady && !error && <span className="field-loading" role="status">正在显影</span>}
  </div>;
}
