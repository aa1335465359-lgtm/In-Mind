import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { PALETTE } from '../../services/memoryArt';
import type { JournalEntry } from '../../types';

interface Props {
  image?: string;
  palette?: string[];
  seed?: number;
  weather?: JournalEntry['weather'];
  mood?: string;
  compact?: boolean;
}

const dustVertex = `
  attribute float aSize;
  attribute float aFade;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFade = aFade;
    gl_PointSize = aSize * min(2.0, 8.0 / max(2.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const dustFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - .5);
    float alpha = smoothstep(.5, .08, d) * vFade * uOpacity;
    if (alpha < .015) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const weatherFragment = `
  precision highp float;
  uniform float uTime;
  uniform float uWeather;
  uniform float uSeed;
  uniform vec3 uTint;
  uniform vec3 uAccent;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 73.0) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.,0.)), f.x), mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0, amp = .52;
    for (int i = 0; i < 5; i++) { value += noise(p) * amp; p = p * 2.03 + 19.17; amp *= .48; }
    return value;
  }
  float snow(vec2 uv, float scale, float speed) {
    vec2 p = uv * scale; p.y += uTime * speed; p.x += sin(p.y * .7 + uTime * .15) * .25;
    vec2 cell = floor(p), f = fract(p) - .5;
    vec2 offset = vec2(hash(cell), hash(cell + 5.31)) - .5;
    return smoothstep(.09, .0, length(f - offset * .68)) * (.35 + hash(cell + 8.1) * .65);
  }
  float rain(vec2 uv, float scale, float speed) {
    vec2 p = uv; p.x += p.y * .12; p *= vec2(scale, scale * .48); p.y += uTime * speed;
    vec2 id = floor(p), f = fract(p); float rnd = hash(id);
    float x = abs(f.x - rnd); float streak = smoothstep(.035, .0, x) * smoothstep(.82, .1, f.y) * smoothstep(.0, .18, f.y);
    return streak * step(.72, rnd);
  }
  void main() {
    vec2 uv = vUv; vec2 p = uv - .5; p.x *= uResolution.x / max(1.0, uResolution.y);
    float vignette = 1.0 - smoothstep(.18, .92, length(p));
    float grain = hash(gl_FragCoord.xy + floor(uTime * 3.0));
    vec3 color = vec3(.0015, .002, .0024);
    float air = fbm(p * 2.25 + vec2(uTime * .008, -uTime * .011));
    color += mix(uTint, uAccent, clamp(uv.y + air * .25, 0., 1.)) * air * .018;

    if (uWeather < .5) {
      float pulse = exp(-12.0 * abs(length(p * vec2(.78,1.0)) - (.31 + sin(uTime * .08) * .008)));
      color += mix(uTint, vec3(.78,.88,.9), .72) * pulse * .035;
    } else if (uWeather < 1.5) {
      float horizon = exp(-14.0 * abs(p.y + .18)) * smoothstep(.75, .05, abs(p.x));
      color += mix(vec3(.16,.12,.07), uAccent, .17) * horizon * .24;
      color += uTint * pow(max(0., 1. - length(p + vec2(.22,.15)) * 1.35), 5.0) * .06;
    } else if (uWeather < 2.5) {
      float r = rain(uv, 34., 8.5) + rain(uv + .18, 52., 13.) * .45;
      color += mix(vec3(.48,.62,.67), uTint, .25) * r * .34;
      color += vec3(.03,.045,.055) * air * .6;
    } else if (uWeather < 3.5) {
      float fog = smoothstep(.28, .82, fbm(p * 1.9 + vec2(uTime * .018, 0.)));
      fog += smoothstep(.48, .88, fbm(p * 3.6 - vec2(uTime * .012, 0.))) * .4;
      color += mix(vec3(.055,.065,.07), uTint * .18, .5) * fog * .78;
    } else {
      float flakes = snow(uv, 18., .18) + snow(uv + .23, 31., .3) * .48 + snow(uv - .31, 48., .44) * .22;
      color += mix(vec3(.7,.78,.8), uTint, .22) * flakes * .68;
      color += vec3(.018,.025,.03) * air;
    }
    color += (grain - .5) * .008;
    color *= .42 + vignette * .75;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function randomFrom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeDust(count: number, seed: number, color: string, mobile: boolean) {
  const rand = randomFrom(seed);
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count), fades = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2, band = Math.pow(rand(), 1.85);
    const radius = .95 + band * (1.05 + rand() * .48), vertical = .78 + rand() * .32;
    const broken = rand() < .17 ? .35 + rand() * .6 : 0;
    positions[i * 3] = Math.cos(angle) * (radius + broken) * (1 + (rand() - .5) * .16);
    positions[i * 3 + 1] = Math.sin(angle) * radius * vertical + (rand() - .5) * .32;
    positions[i * 3 + 2] = (rand() - .5) * (1.05 + band * .9);
    sizes[i] = (mobile ? 1.15 : 1.45) + rand() * (mobile ? 1.8 : 2.8);
    fades[i] = .12 + (1 - band) * .7 * rand();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: .9 } },
    vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

function photoMaterials(texture: THREE.Texture, palette: string[], seed: number) {
  const uniforms = {
    uMap: { value: texture },
    uTint: { value: new THREE.Color(palette[0] || '#dce8e5') },
    uAccent: { value: new THREE.Color(palette[1] || '#b0d7df') },
    uSeed: { value: (seed % 997) / 997 },
  };
  const plane = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform vec3 uAccent; uniform float uSeed; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*91.0)*43758.5453);}
      void main(){
        vec4 src=texture2D(uMap,vUv); float luma=dot(src.rgb,vec3(.299,.587,.114)); vec2 p=vUv-.5;
        float oval=length(p*vec2(1.0,1.14)); float edge=1.0-smoothstep(.3,.52,oval+(.5-luma)*.07);
        float grain=hash(floor(vUv*vec2(230.0,180.0))); float erosion=smoothstep(.16,.76,grain+luma*.38+(1.0-oval)*.58);
        vec3 mono=mix(vec3(luma),src.rgb,.3); vec3 spectral=mix(mono,mix(uTint,uAccent,luma),.13);
        float screenDot=step(.34,fract((gl_FragCoord.x+gl_FragCoord.y)*.22));
        float alpha=src.a*edge*mix(.64,1.0,screenDot)*mix(.58,1.0,erosion); if(alpha<.025)discard;
        gl_FragColor=vec4(spectral,alpha*.86);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const points = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform sampler2D uMap; uniform float uSeed; varying vec2 vUv; varying float vLuma; varying float vEdge;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*83.0)*43758.5453);}
      void main(){
        vUv=uv; vec3 rgb=texture2D(uMap,uv).rgb; vLuma=dot(rgb,vec3(.299,.587,.114));
        vec2 p=uv-.5; float oval=length(p*vec2(1.0,1.16)); vEdge=smoothstep(.25,.53,oval); vec3 displaced=position;
        displaced.z+=(vLuma-.42)*.62+(1.0-oval)*.15; float scatter=vEdge*vEdge*(.05+hash(uv)*.42);
        displaced.xy+=normalize(p+vec2(.0001))*scatter; displaced.z+=(hash(uv*13.7)-.5)*vEdge*.8;
        vec4 mv=modelViewMatrix*vec4(displaced,1.0); gl_PointSize=(1.15+vLuma*2.35+vEdge*1.1)*min(1.8,7.0/max(2.0,-mv.z));
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform vec3 uAccent; varying vec2 vUv; varying float vLuma; varying float vEdge;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 src=texture2D(uMap,vUv).rgb;vec3 mono=mix(vec3(vLuma),src,.22);
      vec3 color=mix(mono,mix(uTint,uAccent,vLuma),.2+vEdge*.18);float alpha=smoothstep(.5,.08,d)*(.34+vLuma*.66)*(.78+vEdge*.18);gl_FragColor=vec4(color,alpha);}
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return { plane, points };
}

const weatherValue = (weather: JournalEntry['weather']) => weather === 'clear' ? 1 : weather === 'rain' ? 2 : weather === 'cloud' ? 3 : weather === 'snow' ? 4 : 0;

export function Planet({ image, palette = PALETTE, seed = 7, weather = 'none', mood, compact }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false), [photoError, setPhotoError] = useState(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pauseRef = useRef(paused); pauseRef.current = paused;
  const resetRef = useRef<() => void>();
  const colors = palette.join(',');

  useEffect(() => {
    const mount = host.current; if (!mount) return;
    setFallback(false); setPhotoError(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch { setFallback(true); return; }
    let disposed = false, frame = 0, visible = true, last = 0;
    const mobile = matchMedia('(max-width: 760px)').matches;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(31, 1, .1, 30);
    camera.position.set(0, .05, compact ? 6.4 : 5.7);
    const backdropScene = new THREE.Scene(), backdropCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const backdropMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uWeather: { value: weatherValue(weather) }, uSeed: { value: (seed % 991) / 991 },
        uTint: { value: new THREE.Color(palette[2] || '#78939a') }, uAccent: { value: new THREE.Color(palette[1] || '#8e536d') },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
      fragmentShader: weatherFragment,
      depthWrite: false, depthTest: false,
    });
    backdropScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMaterial));
    renderer.autoClear = false; renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace; mount.appendChild(renderer.domElement);

    const object = new THREE.Group(); scene.add(object);
    const cloud = new THREE.Group();
    cloud.add(makeDust(mobile ? 4800 : 10500, seed + 19, '#d9e4e2', mobile));
    const coolDust = makeDust(mobile ? 1100 : 2400, seed + 311, palette[2] || '#7698aa', mobile);
    coolDust.scale.set(1.07, 1.03, 1.08); coolDust.rotation.z = .16; cloud.add(coolDust);
    const warmDust = makeDust(mobile ? 650 : 1500, seed + 719, palette[1] || '#a75e78', mobile);
    warmDust.scale.set(1.12, 1.08, 1.06); warmDust.rotation.z = -.11; cloud.add(warmDust); object.add(cloud);

    const textures: THREE.Texture[] = [];
    if (image) {
      new THREE.TextureLoader().setCrossOrigin('anonymous').load(image, texture => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; textures.push(texture);
        const rawAspect = texture.image.width / texture.image.height, aspect = Math.max(.68, Math.min(1.62, rawAspect));
        const height = rawAspect < .82 ? 2.55 : rawAspect > 1.35 ? 1.85 : 2.2, width = height * aspect;
        const segmentsX = mobile ? 115 : 190, segmentsY = Math.round(segmentsX / aspect);
        const geometry = new THREE.PlaneGeometry(width, height, segmentsX, Math.min(230, segmentsY));
        const materials = photoMaterials(texture, palette, seed);
        const photoPlane = new THREE.Mesh(geometry.clone(), materials.plane); photoPlane.position.z = -.12;
        object.add(photoPlane, new THREE.Points(geometry, materials.points));
      }, undefined, () => { if (!disposed) setPhotoError(true); });
    } else {
      const coreGeometry = new THREE.SphereGeometry(.62, mobile ? 54 : 86, mobile ? 38 : 60);
      const core = new THREE.Points(coreGeometry, new THREE.PointsMaterial({ color: '#cedbd9', size: mobile ? .016 : .012, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
      core.scale.set(1, 1.18, .82); object.add(core);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .055;
    controls.minAzimuthAngle = -.28; controls.maxAzimuthAngle = .28; controls.minPolarAngle = 1.38; controls.maxPolarAngle = 1.76; controls.rotateSpeed = .34;
    controls.saveState(); resetRef.current = () => controls.reset();
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = w / h < .72 ? 6.8 : compact ? 6.4 : 5.7;
      camera.updateProjectionMatrix(); backdropMaterial.uniforms.uResolution.value.set(w, h);
    };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(mount); resize();
    const intersection = new IntersectionObserver(items => { visible = items[0]?.isIntersecting ?? true; }); intersection.observe(mount);
    const pace = mood === '疲惫' ? .000025 : mood === '兴奋' || mood === '开心' ? .000065 : .00004;
    const animate = (time: number) => {
      if (disposed) return; frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || time - last < 1000 / 38) return;
      const dt = Math.min((time - last) / 1000, .04); last = time;
      if (!pauseRef.current) {
        object.rotation.y = Math.sin(time * .00011) * .065;
        object.rotation.x = Math.cos(time * .00008) * .014;
        cloud.rotation.z += pace * dt * 60;
        cloud.rotation.y = Math.sin(time * .00009) * .055;
        backdropMaterial.uniforms.uTime.value = time / 1000;
      }
      controls.update(); renderer.clear(); renderer.render(backdropScene, backdropCamera); renderer.clearDepth(); renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setFallback(true); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect(); controls.dispose();
      for (const graph of [scene, backdropScene]) graph.traverse(child => {
        const rendered = child as THREE.Mesh; rendered.geometry?.dispose();
        if (rendered.material) (Array.isArray(rendered.material) ? rendered.material : [rendered.material]).forEach(material => material.dispose());
      });
      textures.forEach(texture => texture.dispose()); renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.dispose(); renderer.domElement.remove(); resetRef.current = undefined;
    };
  }, [image, colors, seed, weather, compact, mood]);

  return <div className={`planet-stage ${compact ? 'planet-compact' : ''}`}>
    <div ref={host} className="planet-canvas" role="img" aria-label="可轻微转动的照片粒子记忆体" style={{ visibility: fallback ? 'hidden' : 'visible' }} />
    {fallback && <div className="planet-fallback">{image ? <img src={image} alt="回忆原图" /> : <span>IN MIND</span>}<p>静态呈现</p></div>}
    {!compact && <div className="planet-tools"><span>{photoError ? '照片没有载入，仍可进入记录查看原图' : fallback ? '当前设备使用静态呈现' : '轻轻拖动，观察回忆的深度'}</span><button aria-label={paused ? '播放动态' : '暂停动态'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button><button aria-label="回到正面" onClick={() => resetRef.current?.()}><RotateCcw size={15} /></button></div>}
  </div>;
}
