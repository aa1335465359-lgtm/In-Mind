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
  uniform float uTime;
  varying float vFade;
  void main() {
    vec3 alive = position;
    float gust = sin(uTime * .42 + position.y * 2.1 + position.z * 1.7);
    alive.x += gust * (.018 + aFade * .055);
    alive.y += cos(uTime * .27 + position.x * 2.4) * aFade * .024;
    vec4 mv = modelViewMatrix * vec4(alive, 1.0);
    vFade = aFade;
    gl_PointSize = aSize * (.9 + sin(uTime * .55 + position.x * 4.0) * .1) * min(1.65, 7.0 / max(2.0, -mv.z));
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
    float air = fbm(p * 2.25 + vec2(uTime * .018, -uTime * .013));
    float airFine = fbm(p * 4.7 - vec2(uTime * .011, uTime * .017));
    float contour = pow(1.0 - abs(sin((air * .74 + airFine * .26 + length(p) * .13 - uTime * .007) * 18.0)), 14.0);
    float outside = smoothstep(.18, .66, length(p));
    vec2 starCell = floor(uv * vec2(150.0, 96.0));
    float star = step(.9935, hash(starCell)) * (.35 + .65 * sin(uTime * .55 + hash(starCell + 9.2) * 6.2831));
    color += mix(uTint, uAccent, clamp(uv.y + air * .25, 0., 1.)) * (air * .042 + contour * outside * .095);
    color += mix(vec3(.48,.58,.58), uTint, .22) * star * .17;

    if (uWeather < .5) {
      float pulse = exp(-18.0 * abs(length(p * vec2(.78,1.0)) - (.3 + sin(uTime * .12) * .012)));
      float current = pow(1.0 - abs(sin((air + p.x * .11 - uTime * .01) * 15.0)), 18.0);
      color += mix(uTint, vec3(.78,.88,.9), .72) * pulse * .09;
      color += mix(uTint,uAccent,.5) * current * outside * .075;
    } else if (uWeather < 1.5) {
      float horizon = exp(-14.0 * abs(p.y + .18)) * smoothstep(.75, .05, abs(p.x));
      color += mix(vec3(.16,.12,.07), uAccent, .17) * horizon * .34;
      color += uTint * pow(max(0., 1. - length(p + vec2(.22,.15)) * 1.35), 5.0) * .11;
    } else if (uWeather < 2.5) {
      float r = rain(uv, 34., 8.5) + rain(uv + .18, 52., 13.) * .45;
      color += mix(vec3(.48,.62,.67), uTint, .25) * r * .48;
      color += vec3(.03,.045,.055) * air * .85;
    } else if (uWeather < 3.5) {
      float fog = smoothstep(.28, .82, fbm(p * 1.9 + vec2(uTime * .018, 0.)));
      fog += smoothstep(.48, .88, fbm(p * 3.6 - vec2(uTime * .012, 0.))) * .4;
      color += mix(vec3(.055,.065,.07), uTint * .18, .5) * fog * 1.12;
    } else {
      float flakes = snow(uv, 18., .18) + snow(uv + .23, 31., .3) * .48 + snow(uv - .31, 48., .44) * .22;
      color += mix(vec3(.7,.78,.8), uTint, .22) * flakes * .68;
      color += vec3(.018,.025,.03) * air;
    }
    color += (grain - .5) * .008;
    color *= .58 + vignette * .72;
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

function makeDust(count: number, seed: number, color: string, mobile: boolean, opacity: number, clocks: Array<{ value: number }>) {
  const rand = randomFrom(seed);
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count), fades = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2, band = Math.pow(rand(), 1.85);
    const radius = .82 + band * (.48 + rand() * .2), vertical = .85 + rand() * .22;
    const broken = rand() < .12 ? .12 + rand() * .28 : 0;
    positions[i * 3] = Math.cos(angle) * (radius + broken) * (1 + (rand() - .5) * .16);
    positions[i * 3 + 1] = Math.sin(angle) * radius * vertical + (rand() - .5) * .32;
    positions[i * 3 + 2] = (rand() - .5) * (1.05 + band * .9);
    sizes[i] = (mobile ? .46 : .54) + rand() * (mobile ? .9 : 1.18);
    fades[i] = .07 + (1 - band) * .38 * rand();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } },
    vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  clocks.push(material.uniforms.uTime);
  return new THREE.Points(geometry, material);
}

function makeSeed(seed: number, mobile: boolean, clocks: Array<{ value: number }>) {
  const group = new THREE.Group(), rand = randomFrom(seed + 404);
  const ring = (count: number, radius: number, color: string, opacity: number, tilt: number) => {
    const positions = new Float32Array(count * 3), sizes = new Float32Array(count), fades = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2, scatter = (rand() - .5) * .18;
      positions[i * 3] = Math.cos(angle) * (radius + scatter);
      positions[i * 3 + 1] = Math.sin(angle) * (radius + scatter) * .72;
      positions[i * 3 + 2] = (rand() - .5) * .3;
      sizes[i] = .5 + rand() * (mobile ? .9 : 1.25); fades[i] = .2 + rand() * .6;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
    const material = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } }, vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    clocks.push(material.uniforms.uTime);
    const points = new THREE.Points(geometry, material); points.rotation.z = tilt; group.add(points);
  };
  ring(mobile ? 1000 : 2100, .7, '#c9d8d6', .55, -.08);
  ring(mobile ? 420 : 850, .82, '#738f91', .35, .18);
  const coreTime = { value: 0 }; clocks.push(coreTime);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.48, 72, 48), new THREE.ShaderMaterial({
    uniforms: { uTime: coreTime, uColor: { value: new THREE.Color('#91aaa7') } },
    vertexShader: `varying vec3 vNormal;varying vec3 vView;uniform float uTime;void main(){vec3 alive=position+normal*sin(position.y*11.0+uTime*.55)*.008;vec4 mv=modelViewMatrix*vec4(alive,1.0);vNormal=normalMatrix*normal;vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vNormal;varying vec3 vView;uniform vec3 uColor;uniform float uTime;void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.6);float pulse=.86+sin(uTime*.48)*.14;gl_FragColor=vec4(uColor*rim*pulse,rim*.34);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(core); return group;
}

function photoMaterials(texture: THREE.Texture, palette: string[], seed: number, imageAspect: number, clocks: Array<{ value: number }>) {
  const uniforms = {
    uMap: { value: texture },
    uTint: { value: new THREE.Color(palette[0] || '#dce8e5') },
    uAccent: { value: new THREE.Color(palette[1] || '#b0d7df') },
    uSeed: { value: (seed % 997) / 997 },
    uTime: { value: 0 },
    uImageAspect: { value: imageAspect },
    uFrameAspect: { value: 1.9 / 2.25 },
  };
  clocks.push(uniforms.uTime);
  const uvCover = `
    vec2 coverUv(vec2 raw) {
      vec2 mapped = raw;
      if (uImageAspect > uFrameAspect) mapped.x = (raw.x - .5) * (uFrameAspect / uImageAspect) + .5;
      else mapped.y = (raw.y - .5) * (uImageAspect / uFrameAspect) + .5;
      return mapped;
    }
  `;
  const plane = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform sampler2D uMap; uniform float uTime; uniform float uImageAspect; uniform float uFrameAspect;
      varying vec2 vUv; varying float vEdge; varying float vLuma;
      ${uvCover}
      void main(){
        vUv=coverUv(uv); vec3 rgb=texture2D(uMap,vUv).rgb; vLuma=dot(rgb,vec3(.299,.587,.114));
        vec2 p=uv-.5; float oval=length(p*vec2(1.0,1.08)); vEdge=smoothstep(.28,.51,oval);
        vec3 alive=position; float wind=sin(uTime*.48+position.y*4.1+sin(position.x*3.0));
        alive.z+=(vLuma-.48)*.34+(1.0-oval)*.08+wind*.018;
        alive.x+=wind*(.006+vEdge*.022); alive.y+=sin(uTime*.31+position.x*3.8)*vEdge*.012;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(alive,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform vec3 uAccent; uniform float uSeed;
      varying vec2 vUv; varying float vEdge; varying float vLuma;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*91.0)*43758.5453);}
      void main(){
        vec4 src=texture2D(uMap,vUv); float grain=hash(floor(gl_FragCoord.xy*.55));
        float cleanCore=1.0-smoothstep(.18,.38,vEdge); float dissolve=smoothstep(.2,.78,grain+vLuma*.18);
        float mask=(1.0-vEdge)*mix(dissolve,1.0,cleanCore); if(mask<.02)discard;
        vec3 mono=mix(vec3(vLuma),src.rgb,.72); vec3 spectral=mix(mono,mix(uTint,uAccent,vLuma),.055+vEdge*.09);
        gl_FragColor=vec4(spectral,src.a*mask*(.84+cleanCore*.14));
      }
    `,
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
  });
  const points = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform sampler2D uMap; uniform float uSeed; uniform float uTime; uniform float uImageAspect; uniform float uFrameAspect;
      varying vec2 vUv; varying float vLuma; varying float vEdge; varying float vLife;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*83.0)*43758.5453);}
      ${uvCover}
      void main(){
        vUv=coverUv(uv); vec3 rgb=texture2D(uMap,vUv).rgb; vLuma=dot(rgb,vec3(.299,.587,.114));
        vec2 p=uv-.5; float oval=length(p*vec2(1.0,1.08)); vEdge=smoothstep(.2,.52,oval); vLife=hash(uv*19.7);
        vec3 alive=position; float gust=sin(uTime*.55+position.y*5.0+vLife*6.2831);
        alive.z+=(vLuma-.46)*.48+(1.0-oval)*.1+(vLife-.5)*vEdge*.48;
        alive.x+=normalize(p+vec2(.0001)).x*vEdge*vEdge*(.025+vLife*.19)+gust*vEdge*.055;
        alive.y+=normalize(p+vec2(.0001)).y*vEdge*vEdge*(.02+vLife*.14)+sin(uTime*.33+position.x*4.0)*vEdge*.026;
        vec4 mv=modelViewMatrix*vec4(alive,1.0);
        gl_PointSize=(.45+vLuma*.9+vEdge*.42)*(.86+sin(uTime*.7+vLife*8.0)*.14)*min(1.5,6.2/max(2.0,-mv.z));
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform vec3 uAccent;
      varying vec2 vUv; varying float vLuma; varying float vEdge; varying float vLife;
      void main(){
        float d=length(gl_PointCoord-.5); if(d>.5)discard; vec3 src=texture2D(uMap,vUv).rgb;
        vec3 color=mix(mix(vec3(vLuma),src,.58),mix(uTint,uAccent,vLife),.08+vEdge*.16);
        float alpha=smoothstep(.5,.08,d)*mix(.055,.48,vEdge)*(.35+vLuma*.65); if(alpha<.012)discard;
        gl_FragColor=vec4(color,alpha);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
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
    camera.position.set(0, .05, compact ? 6.2 : 6.0);
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

    const clocks: Array<{ value: number }> = [];
    const object = new THREE.Group(); object.scale.setScalar(.92); object.position.y = .12; scene.add(object);
    const cloud = new THREE.Group();
    cloud.add(makeDust(mobile ? 2100 : 4800, seed + 19, '#b8c6c4', mobile, .42, clocks));
    const coolDust = makeDust(mobile ? 480 : 1050, seed + 311, '#68858a', mobile, .26, clocks);
    coolDust.scale.set(1.08, 1.04, 1.08); coolDust.rotation.z = .16; cloud.add(coolDust);
    const warmDust = makeDust(mobile ? 260 : 620, seed + 719, '#8c5d6e', mobile, .2, clocks);
    warmDust.scale.set(1.12, 1.07, 1.06); warmDust.rotation.z = -.11; cloud.add(warmDust); object.add(cloud);

    const textures: THREE.Texture[] = [];
    if (image) {
      new THREE.TextureLoader().setCrossOrigin('anonymous').load(image, texture => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; textures.push(texture);
        const rawAspect = texture.image.width / texture.image.height;
        const segmentsX = mobile ? 105 : 175, segmentsY = mobile ? 126 : 208;
        const geometry = new THREE.PlaneGeometry(1.9, 2.25, segmentsX, segmentsY);
        const materials = photoMaterials(texture, palette, seed, rawAspect, clocks);
        const photoPlane = new THREE.Mesh(geometry.clone(), materials.plane); photoPlane.position.z = -.12;
        object.add(photoPlane, new THREE.Points(geometry, materials.points));
      }, undefined, () => { if (!disposed) setPhotoError(true); });
    } else {
      object.add(makeSeed(seed, mobile, clocks));
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .055;
    controls.minAzimuthAngle = -.28; controls.maxAzimuthAngle = .28; controls.minPolarAngle = 1.38; controls.maxPolarAngle = 1.76; controls.rotateSpeed = .34;
    controls.saveState(); resetRef.current = () => controls.reset();
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = w / h < .72 ? 6.65 : compact ? 6.2 : 6.0;
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
        for (const clock of clocks) clock.value = time / 1000;
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
