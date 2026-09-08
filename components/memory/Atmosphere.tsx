import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { JournalEntry } from '../../types';

interface Props {
  atmosphere?: NonNullable<JournalEntry['planet']>['atmosphere'];
  weather?: JournalEntry['weather'];
  palette?: string[];
  seed?: number;
  subdued?: boolean;
}

// Full-page atmosphere only. The memory object is rendered by Planet on a separate transparent canvas.
// The composition is original; its small procedural building blocks are informed by the MIT-licensed
// webgl-noise, sunset-shader and water-shader projects credited in README.md.
const fragment = `
  precision highp float;
  uniform float uTime;
  uniform float uPrevious;
  uniform float uNext;
  uniform float uBlend;
  uniform float uSeed;
  uniform vec2 uResolution;
  uniform vec3 uTint;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32 + uSeed * 7.0);
    return fract(p.x * p.y);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), f.x), mix(hash21(i + vec2(0., 1.)), hash21(i + 1.), f.x), f.y);
  }
  float fbm(vec2 p) {
    float sum = 0.0, amp = .52;
    mat2 turn = mat2(.82, .57, -.57, .82);
    for (int i = 0; i < 5; i++) { sum += valueNoise(p) * amp; p = turn * p * 2.03 + 13.17; amp *= .48; }
    return sum;
  }
  float ridge(vec2 p) { return 1.0 - abs(fbm(p) * 2.0 - 1.0); }
  float starLayer(vec2 p, float scale, float threshold) {
    vec2 cell = floor(p * scale), q = fract(p * scale) - .5;
    float rnd = hash21(cell), radius = mix(.012, .05, hash21(cell + 7.4));
    float star = (1.0 - smoothstep(0.0, radius, length(q - (vec2(hash21(cell + 2.1), hash21(cell + 9.7)) - .5) * .56)));
    return star * step(threshold, rnd) * (.7 + .3 * sin(uTime * mix(.25, .8, rnd) + rnd * 31.0));
  }
  vec3 cosmos(vec2 uv, vec2 p) {
    vec2 drift = vec2(uTime * .0025, -uTime * .0014);
    float nebula = fbm(p * 1.75 + drift + fbm(p * 2.3) * .34);
    float vein = pow(max(0.0, ridge(p * 2.45 - drift) - .47), 2.4);
    float stars = starLayer(uv + drift, 112.0, .967) + starLayer(uv - drift * 1.7, 211.0, .987) * .65;
    vec3 color = vec3(.0015, .0025, .006);
    color += mix(vec3(.025,.07,.11)+uTint*.22, vec3(.075,.028,.085)+uAccent*.22, nebula) * smoothstep(.27, .73, nebula);
    color += mix(uTint, uAccent, fbm(p * 4.0)) * vein * .11;
    color += mix(vec3(.62, .73, .82), uTint, .22) * stars * .72;
    return color;
  }
  vec3 stars(vec2 uv, vec2 p) {
    float horizon = smoothstep(-.45, .55, p.y);
    float milky = pow(max(0.0, fbm(vec2(p.x * .8 + p.y * .32, p.y * 2.2) + vec2(uTime * .002, 0.0)) - .47), 2.2);
    float points = starLayer(uv, 88.0, .95) + starLayer(uv + .19, 174.0, .982) * .7;
    vec3 color = mix(vec3(.002,.004,.009), vec3(.006,.012,.026), horizon);
    color += mix(uTint * .12, vec3(.2,.25,.36), .45) * milky * .72;
    color += mix(vec3(.78,.84,.9), uAccent, .1) * points * .62;
    return color;
  }
  vec3 aurora(vec2 uv, vec2 p) {
    vec3 color = stars(uv, p) * .58;
    float curtains = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float bend = fbm(vec2(p.x * 1.15 + fi * 4.1, uTime * .018 + fi)) * .52;
      float line = p.y - (.12 + bend * .48 + sin(p.x * (1.25 + fi * .09) + fi) * .08);
      float ribbon = exp(-abs(line) * (8.0 + fi * 2.2));
      ribbon *= smoothstep(-.5, .35, p.y) * (.45 + .55 * ridge(vec2(p.x * 3.0 + fi, p.y - uTime * .015)));
      curtains += ribbon * (.38 - fi * .055);
    }
    vec3 green = mix(vec3(.03,.34,.28), uTint, .18);
    vec3 violet = mix(vec3(.3,.06,.43), uAccent, .22);
    color += mix(green, violet, smoothstep(-.4, .65, p.x + fbm(p * 1.7) * .35)) * curtains;
    color += vec3(.08,.23,.2) * pow(curtains, 3.0) * .65;
    return color;
  }
  vec3 sky(vec2 uv, vec2 p, bool cloudHeavy) {
    float vertical = clamp(uv.y, 0.0, 1.0);
    vec3 zenith = cloudHeavy ? vec3(.055,.075,.09) : mix(vec3(.035,.12,.2), uTint * .22, .18);
    vec3 horizon = cloudHeavy ? vec3(.17,.19,.2) : vec3(.34,.46,.55);
    vec3 color = mix(horizon, zenith, pow(vertical, .72));
    vec2 flow = vec2(uTime * .009, uTime * .0015);
    float body = fbm(vec2(p.x * 1.5, p.y * 2.1) + flow + fbm(p * 1.2) * .24);
    float detail = fbm(p * 4.1 - flow * 1.4);
    float cloud = smoothstep(cloudHeavy ? .42 : .57, .82, body * .76 + detail * .24);
    cloud *= smoothstep(-.6, .7, p.y + .42);
    float silver = pow(smoothstep(.48,.72,body) * (1.0 - smoothstep(.72,.9,body)), 1.2);
    color = mix(color, cloudHeavy ? vec3(.34,.36,.37) : vec3(.68,.72,.73), cloud * (cloudHeavy ? .64 : .38));
    color += vec3(.25,.29,.3) * silver * .16;
    float sun = exp(-length(p - vec2(-.28,.21)) * 9.0);
    color += vec3(.52,.38,.24) * sun * (cloudHeavy ? .04 : .16);
    return color;
  }
  vec3 ocean(vec2 uv, vec2 p) {
    float horizonY = .53;
    vec3 color = sky(uv, p, false) * .72;
    if (uv.y < horizonY) {
      float depth = clamp((horizonY - uv.y) / horizonY, 0.0, 1.0);
      vec2 q = vec2(p.x / max(.12, depth + .08), depth * 7.0);
      float wave = sin(q.x * 7.0 + q.y * 4.2 - uTime * .34) * .5;
      wave += sin(q.x * 12.3 - q.y * 6.1 + uTime * .21) * .27;
      wave += (fbm(q * .7 + vec2(uTime * .035, 0.0)) - .5) * 1.1;
      float glint = pow(max(0.0, wave * .5 + .34 - abs(p.x + .24) * .6), 5.0) * (1.0 - depth);
      vec3 water = mix(vec3(.006,.022,.032), mix(uTint * .15, vec3(.025,.11,.15), .6), 1.0 - depth);
      water += vec3(.5,.39,.27) * glint * .56;
      float crest = smoothstep(.58,.78,wave) * (1.0-depth) * .13;
      color = water + vec3(.32,.42,.45) * crest;
    }
    color += vec3(.42,.33,.24) * exp(-abs(uv.y-horizonY)*90.0) * .14;
    return color;
  }
  float rainDrop(vec2 uv, float scale, float speed) {
    vec2 p = uv * vec2(scale, scale * .42); p.x += p.y * .16; p.y += uTime * speed;
    vec2 id = floor(p), f = fract(p); float rnd = hash21(id);
    float x = abs(f.x - mix(.15,.85,rnd));
    float dash = (1.0-smoothstep(.34,.92,f.y)) * smoothstep(.05,.18,f.y);
    return (1.0-smoothstep(0.0,.024,x)) * dash * step(.63,rnd);
  }
  vec3 rain(vec2 uv, vec2 p) {
    float fog = fbm(p * 2.0 + vec2(uTime * .012,0.0));
    vec3 color = mix(vec3(.003,.008,.012), vec3(.025,.045,.058), smoothstep(-.4,.65,p.y));
    color += mix(uTint * .08, vec3(.07,.095,.105), .7) * fog * .24;
    float drops = rainDrop(uv, 34.0, 7.0) + rainDrop(uv + .27, 58.0, 12.0) * .42 + rainDrop(uv - .18, 91.0, 18.0) * .18;
    color += mix(vec3(.43,.58,.64), uTint, .16) * drops * .52;
    float wetGlow = exp(-length(p - vec2(.3,-.48))*5.4) + exp(-length(p - vec2(-.34,-.45))*6.2);
    color += uAccent * wetGlow * .045;
    return color;
  }
  vec3 renderMode(vec2 uv, vec2 p, float mode) {
    if (mode < .5) return cosmos(uv,p);
    if (mode < 1.5) return ocean(uv,p);
    if (mode < 2.5) return sky(uv,p,false);
    if (mode < 3.5) return aurora(uv,p);
    if (mode < 4.5) return stars(uv,p);
    if (mode < 5.5) return sky(uv,p,true);
    return rain(uv,p);
  }
  void main() {
    vec2 uv = vUv;
    vec2 p = uv - .5; p.x *= uResolution.x / max(1.0, uResolution.y);
    vec3 color = renderMode(uv,p,uNext);
    if(uBlend < .999) {
      float blend = uBlend * uBlend * (3.0 - 2.0 * uBlend);
      color = mix(renderMode(uv,p,uPrevious), color, blend);
    }
    float vignette = 1.0 - smoothstep(.28,1.05,length(p));
    float grain = hash21(gl_FragCoord.xy + floor(uTime * 2.0)) - .5;
    color *= .52 + vignette * .63;
    color = max(vec3(0.0),color + grain * .0015);
    color = color * 1.7 / (vec3(1.0) + color * 1.7);
    gl_FragColor = vec4(color,1.0);
    #include <colorspace_fragment>
  }
`;

const atmosphereValue = (atmosphere: Props['atmosphere'], weather: Props['weather'], seed: number) => {
  if (atmosphere) return { cosmos: 0, ocean: 1, sky: 2, aurora: 3, stars: 4, clouds: 5, rain: 6 }[atmosphere];
  if (weather === 'rain') return 6;
  if (weather === 'cloud') return 5;
  if (weather === 'clear') return seed % 3 === 0 ? 1 : 2;
  if (weather === 'snow') return 4;
  return seed % 4 === 0 ? 3 : 0;
};

export function Atmosphere({ atmosphere, weather = 'none', palette = ['#78939a', '#8e536d'], seed = 7, subdued }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const update = useRef<(mode: number, colors: string[], nextSeed: number) => void>();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const mount = host.current; if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' }); }
    catch { setFallback(true); return; }
    let frame = 0, disposed = false, visible = true, last = 0, blendStarted = performance.now();
    let currentMode = atmosphereValue(atmosphere, weather, seed);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let elapsed = 0;
    const tintTarget = new THREE.Color(palette[2] || palette[0] || '#78939a');
    const accentTarget = new THREE.Color(palette[1] || '#8e536d');
    const uniforms = {
      uTime: { value: 0 }, uPrevious: { value: currentMode }, uNext: { value: currentMode }, uBlend: { value: 1 },
      uSeed: { value: (seed % 991) / 991 }, uResolution: { value: new THREE.Vector2(1,1) },
      uTint: { value: new THREE.Color(palette[2] || palette[0] || '#78939a') },
      uAccent: { value: new THREE.Color(palette[1] || '#8e536d') },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.0);}',
      fragmentShader: fragment,
      depthWrite: false,
      depthTest: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), material));
    const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const mobile = matchMedia('(max-width: 760px)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.05 : 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    update.current = (mode, colors, nextSeed) => {
      if (mode !== uniforms.uNext.value) {
        currentMode = uniforms.uBlend.value > .5 ? uniforms.uNext.value : uniforms.uPrevious.value;
        uniforms.uPrevious.value = currentMode; uniforms.uNext.value = mode; uniforms.uBlend.value = 0;
        blendStarted = performance.now();
      }
      // Keep the noise field stable across records; changing its seed visibly pops every cloud/star.
      tintTarget.set(colors[2] || colors[0] || '#78939a');
      accentTarget.set(colors[1] || '#8e536d');
    };
    const resize = () => {
      const width = mount.clientWidth, height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width,height,false); uniforms.uResolution.value.set(width,height);
    };
    const ro = new ResizeObserver(resize); ro.observe(mount); resize();
    const io = new IntersectionObserver(items => { visible = items[0]?.isIntersecting ?? true; }); io.observe(mount);
    const animate = (time: number) => {
      if (disposed) return; frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || time - last < 1000 / 34) return;
      const dt = Math.min((time-last)/1000,.05); last = time;
      if(!reduce.matches) elapsed += dt;
      uniforms.uTime.value = elapsed;
      uniforms.uTint.value.lerp(tintTarget, 1-Math.exp(-dt*2));
      uniforms.uAccent.value.lerp(accentTarget, 1-Math.exp(-dt*2));
      if (uniforms.uBlend.value < 1) uniforms.uBlend.value = reduce.matches ? 1 : Math.min(1, (time - blendStarted) / 1250);
      renderer.render(scene,camera);
    };
    frame = requestAnimationFrame(animate);
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setFallback(true); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); update.current = undefined;
      renderer.domElement.removeEventListener('webglcontextlost', lost); material.dispose();
      (scene.children[0] as THREE.Mesh).geometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    update.current?.(atmosphereValue(atmosphere, weather, seed), palette, seed);
  }, [atmosphere, weather, palette.join(','), seed]);

  return <div ref={host} className={`atmosphere ${subdued ? 'atmosphere-subdued' : ''} ${fallback ? 'atmosphere-fallback' : ''}`} aria-hidden="true" />;
}
