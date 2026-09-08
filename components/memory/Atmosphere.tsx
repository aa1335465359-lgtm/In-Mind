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
  // Fixed key light for the landscape mode: up, left, in front of the camera.
  const vec3 LSUN = vec3(-.5215, .3410, .7822);

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
    // OCTAVES is injected per device: 5 on desktop, 3 on phones where the same
    // octaves cost both compile time and frame time for detail the small, scaled
    // canvas cannot show anyway.
    for (int i = 0; i < OCTAVES; i++) { sum += valueNoise(p) * amp; p = turn * p * 2.03 + 13.17; amp *= .48; }
    return sum;
  }
  float ridge(vec2 p) { return 1.0 - abs(fbm(p) * 2.0 - 1.0); }
  float starLayer(vec2 p, float scale, float threshold) {
    vec2 cell = floor(p * scale), q = fract(p * scale) - .5;
    float rnd = hash21(cell), radius = mix(.012, .05, hash21(cell + 7.4));
    float star = (1.0 - smoothstep(0.0, radius, length(q - (vec2(hash21(cell + 2.1), hash21(cell + 9.7)) - .5) * .56)));
    return star * step(threshold, rnd) * (.7 + .3 * sin(uTime * mix(.25, .8, rnd) + rnd * 31.0));
  }
  float hazeBand(vec2 p, float offset) {
    float axis = p.y * .74 + p.x * .28 + offset;
    float body = exp(-abs(axis) * 4.2);
    float cavities = fbm(vec2(p.x * 2.1, p.y * 4.4) + vec2(uTime * .002, 3.7));
    return body * smoothstep(.27, .78, cavities);
  }
  float bokehLayer(vec2 uv, float scale, float drift) {
    vec2 grid = uv * scale + vec2(uTime * drift, 0.0);
    vec2 id = floor(grid), cell = fract(grid) - .5;
    vec2 point = vec2(hash21(id + 4.2), hash21(id + 9.7)) - .5;
    float radius = mix(.025, .14, hash21(id + 2.3));
    float disc = 1.0 - smoothstep(radius * .35, radius, length(cell - point * .72));
    return disc * step(.78, hash21(id));
  }
  vec3 cosmos(vec2 uv, vec2 p) {
    vec2 drift = vec2(uTime * .0025, -uTime * .0014);
    float nebula = fbm(p * 1.62 + drift + fbm(p * 2.2) * .36);
    float band = hazeBand(p, -.04) + hazeBand(p * 1.13, .24) * .34;
    float vein = pow(max(0.0, ridge(p * 2.75 - drift) - .43), 2.7);
    float stars = starLayer(uv + drift, 82.0, .944) * .62;
    stars += starLayer(uv - drift * 1.7, 167.0, .979) * .82;
    stars += starLayer(uv + drift * 3.0, 283.0, .991) * .5;
    vec3 color = mix(vec3(.001,.002,.006), vec3(.004,.009,.015), smoothstep(-.4,.6,p.y));
    vec3 coolDust = mix(vec3(.025,.085,.12), uTint * .34, .3);
    vec3 warmDust = mix(vec3(.14,.035,.07), uAccent * .3, .35);
    color += mix(coolDust, warmDust, nebula) * band * (.48 + nebula * .48);
    color += mix(uTint, uAccent, fbm(p * 4.0)) * vein * band * .15;
    color += mix(vec3(.68,.78,.86), uTint, .16) * stars;
    float core = exp(-length(p - vec2(-.28,.08)) * 4.8) * band;
    color += mix(vec3(.34,.31,.25), uAccent, .12) * core * .18;
    return color;
  }
  vec3 stars(vec2 uv, vec2 p) {
    float horizon = smoothstep(-.45, .55, p.y);
    float milky = hazeBand(vec2(p.x * .9 + p.y * .18,p.y), .12);
    float points = starLayer(uv, 88.0, .95) + starLayer(uv + .19, 174.0, .982) * .7 + starLayer(uv-.11,272.0,.992)*.4;
    vec3 color = mix(vec3(.002,.004,.009), vec3(.006,.012,.026), horizon);
    color += mix(uTint * .18, vec3(.2,.25,.36), .45) * milky * .42;
    color += mix(vec3(.78,.84,.9), uAccent, .1) * points * .62;
    return color;
  }
  vec3 aurora(vec2 uv, vec2 p) {
    vec3 color = stars(uv, p) * .64;
    float curtains = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float bend = fbm(vec2(p.x * 1.15 + fi * 4.1, uTime * .018 + fi)) * .52;
      float line = p.y - (.12 + bend * .48 + sin(p.x * (1.25 + fi * .09) + fi) * .08);
      float ribbon = exp(-abs(line) * (7.0 + fi * 2.2));
      ribbon *= smoothstep(-.5, .35, p.y) * (.45 + .55 * ridge(vec2(p.x * 3.0 + fi, p.y - uTime * .015)));
      curtains += ribbon * (.38 - fi * .055);
    }
    vec3 green = mix(vec3(.03,.34,.28), uTint, .18);
    vec3 violet = mix(vec3(.3,.06,.43), uAccent, .22);
    float strands = .56 + .44 * pow(abs(sin((p.x + fbm(p*2.0)*.16)*64.0)), 5.0);
    color += mix(green, violet, smoothstep(-.4, .65, p.x + fbm(p * 1.7) * .35)) * curtains * strands;
    color += vec3(.08,.23,.2) * pow(curtains, 2.4) * .76;
    return color;
  }
  vec3 sky(vec2 uv, vec2 p, bool cloudHeavy) {
    float vertical = clamp(uv.y, 0.0, 1.0);
    vec3 zenith = cloudHeavy ? vec3(.055,.075,.09) : mix(vec3(.035,.12,.2), uTint * .22, .18);
    vec3 horizon = cloudHeavy ? vec3(.17,.19,.2) : vec3(.34,.46,.55);
    vec3 color = mix(horizon, zenith, pow(vertical, .72));
    vec2 flow = vec2(uTime * .009, uTime * .0015);
    float farBody = fbm(vec2(p.x * 1.05, p.y * 1.5) + flow * .42);
    float body = fbm(vec2(p.x * 1.5, p.y * 2.1) + flow + fbm(p * 1.2) * .24);
    float detail = fbm(p * 4.1 - flow * 1.4);
    float farCloud = smoothstep(.5,.77,farBody) * smoothstep(-.55,.72,p.y+.5);
    float cloud = smoothstep(cloudHeavy ? .42 : .57, .82, body * .76 + detail * .24);
    cloud *= smoothstep(-.6, .7, p.y + .42);
    float silver = pow(smoothstep(.48,.72,body) * (1.0 - smoothstep(.72,.9,body)), 1.2);
    color = mix(color, cloudHeavy ? vec3(.23,.27,.29) : vec3(.48,.56,.59), farCloud * .25);
    color = mix(color, cloudHeavy ? vec3(.39,.41,.42) : vec3(.72,.75,.74), cloud * (cloudHeavy ? .7 : .44));
    color += vec3(.25,.29,.3) * silver * .16;
    float sun = exp(-length(p - vec2(-.28,.21)) * 9.0);
    float ray = exp(-abs((p.x+.28)*.9-(p.y-.21)*.22)*7.0) * (1.0-smoothstep(-.15,.5,p.y)) * (1.0-cloud);
    color += vec3(.58,.43,.28) * (sun + ray*.22) * (cloudHeavy ? .05 : .19);
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
      float glint = pow(max(0.0, wave * .5 + .38 - abs(p.x + .24) * .55), 5.0) * (1.0 - depth);
      vec3 water = mix(vec3(.006,.022,.032), mix(uTint * .15, vec3(.025,.11,.15), .6), 1.0 - depth);
      water += vec3(.5,.39,.27) * glint * .56;
      float crest = smoothstep(.54,.79,wave) * (1.0-depth) * .16;
      float reflection = pow(max(0.0, 1.0-abs(p.x+.24)*2.4),5.0) * (1.0-depth) * (.35+.65*max(0.0,wave));
      color = water + vec3(.34,.46,.49) * crest + vec3(.55,.4,.25)*reflection*.2;
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
    color += mix(vec3(.43,.58,.64), uTint, .16) * drops * .56;
    float bokeh = bokehLayer(uv,7.0,.004) + bokehLayer(uv+.31,12.0,-.006)*.45;
    color += mix(vec3(.12,.22,.25),uAccent*.28,.35)*bokeh*.34;
    float wetGlow = exp(-length(p - vec2(.3,-.48))*5.4) + exp(-length(p - vec2(-.34,-.45))*6.2);
    color += uAccent * wetGlow * .045;
    return color;
  }
  // --- 山色 landscape -------------------------------------------------------
  // A screen-space homage to the Shadertoy classics: layered ridged silhouettes
  // with aerial perspective, a reflective lake whose wave normals carry the sun
  // glitter, and a graded filmic finish. No raymarching — every feature comes
  // from a handful of fbm taps so the whole scene still runs on phones.
  vec3 lsSky(vec3 rd) {
    float h = clamp(rd.y / .38, 0.0, 1.0);
    vec3 color = mix(vec3(.58,.68,.78), vec3(.22,.42,.80), pow(h, .62));
    color = mix(vec3(.78,.82,.86), color, smoothstep(-.02,.07,rd.y));
    float sun = clamp(dot(rd, LSUN), 0.0, 1.0);
    color += vec3(1.0,.86,.62) * pow(sun, 5.0) * .085;   // wide warm wash
    color += vec3(1.0,.80,.52) * pow(sun, 120.0) * .85;  // near-sun glare
    return color;
  }
  float lsClouds(vec3 rd) {
    if (rd.y < .012) return 0.0;
    vec2 cuv = rd.xz / (rd.y + .25) + vec2(uTime * .0045 + uSeed * 5.0, uSeed * 2.0);
    return smoothstep(.44, .8, fbm(cuv)) * smoothstep(.012, .09, rd.y);
  }
  // One ridged fbm plus one cheap detail octave; the per-layer seed gives each
  // ridge line its own character, like separate mountain ranges.
  float lsRidge(float x, float layerSeed) {
    return ridge(vec2(x, layerSeed)) + .45 * valueNoise(vec2(x * 2.6 + layerSeed * 3.7, layerSeed));
  }
  vec3 lsScene(vec2 p) {
    vec3 rd = normalize(vec3(p, 1.15));
    vec3 color = lsSky(rd);
    float cover = lsClouds(rd);
    if (cover > 0.0) {
      float dense = lsClouds(normalize(rd + LSUN * .12));
      vec3 cloudColor = mix(vec3(1.06,1.04,1.0), vec3(.70,.74,.82), clamp(dense - cover + .55, 0.0, 1.0));
      color = mix(color, cloudColor, .85 * cover);
    }
    // Four ridges, far to near. Nearer ranges are larger, lower-frequency, and
    // fade less into the haze — that overlap is what sells the depth.
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float layerSeed = uSeed + fi * 13.1;
      float freq = .62 + fi * .21;
      float xw = p.x * (.9 + fi * .62) + uSeed * 7.3 + fi * 31.7 + uTime * .0016 * (1.0 + fi);
      float amp = .085 + fi * .041;
      float base = .030 + fi * .008;
      float top = base + lsRidge(xw * freq, layerSeed) * amp;
      if (p.y < top) {
        float e = .012;
        float dx = lsRidge((xw + e) * freq, layerSeed) - lsRidge((xw - e) * freq, layerSeed);
        vec2 nor = normalize(vec2(-dx * amp / (2.0 * e), 1.0));
        float dif = clamp(dot(nor, vec2(LSUN.x, LSUN.y + .30)), 0.0, 1.0);
        float hgt = clamp((p.y - base) / max(top - base, .001), 0.0, 1.0);
        // Lush green slopes with sunlit dry grass on the crests.
        vec3 forest = mix(vec3(.085,.20,.085), vec3(.22,.36,.15), hgt);
        forest = mix(forest, vec3(.34,.33,.22), smoothstep(.72,.98,hgt) * .5);
        forest *= .38 + 1.05 * dif;
        forest += vec3(.10,.09,.05) * pow(clamp(dot(nor, LSUN.xy), 0.0, 1.0), 2.0);
        float aerial = 1.0 - exp(-(1.0 + fi) * .34);
        forest = mix(forest, color * .92 + vec3(.05,.06,.08), aerial * .82);
        color = forest;
      }
    }
    return color;
  }
  vec3 landscape(vec2 p) {
    float wy = -.028;  // lake waterline
    if (p.y >= wy) return lsScene(p);
    // Mirror the world above the waterline, wobbled by fbm waves; the wobble
    // grows with proximity so the near shore shimmers and the far shore stays
    // glassy, exactly like a real lake reflection.
    float depth = clamp((wy - p.y) * 2.3, 0.0, 1.0);
    vec2 wuv = vec2(p.x * 3.2, (wy - p.y) * 9.0) + uSeed * 3.0;
    float wob = fbm(wuv * (2.2 + depth * 2.4) + vec2(uTime * .045, uTime * .02));
    vec2 mirrored = vec2(p.x + (wob - .5) * .045 * depth, 2.0 * wy - p.y + (wob - .5) * .02 * depth);
    vec3 reflected = lsScene(mirrored) * vec3(.50,.60,.64);
    vec3 rd = normalize(vec3(p, 1.15));
    // Grazing rays near the horizon mirror strongly; steep rays show the water body.
    // (No pow(): its base goes negative for steep rays, which is undefined GLSL.)
    float fres = clamp(1.0 + rd.y * 3.2, 0.0, 1.0);
    fres = fres * fres * fres;
    vec3 deep = mix(vec3(.06,.24,.22), vec3(.02,.11,.12), depth);
    vec3 color = mix(deep, reflected, .28 + .72 * fres);
    // Seascape-style sun glitter riding on the wave normals.
    vec2 guv = wuv * 5.5 + vec2(uTime * .10, uTime * .03);
    float e = .05;
    float h0 = fbm(guv);
    vec3 wn = normalize(vec3(-(fbm(guv + vec2(e,0.0)) - h0) / e, 5.5, -(fbm(guv + vec2(0.0,e)) - h0) / e));
    float glitter = pow(clamp(dot(reflect(rd, wn), LSUN), 0.0, 1.0), 220.0);
    color += vec3(1.0,.88,.68) * glitter * (2.2 - 1.4 * depth);
    color += vec3(.5,.58,.62) * exp(-abs(p.y - wy) * 40.0) * .10;  // waterline haze
    return color;
  }
  vec3 renderMode(vec2 uv, vec2 p, float mode) {
    if (mode < .5) return cosmos(uv,p);
    if (mode < 1.5) return ocean(uv,p);
    if (mode < 2.5) return sky(uv,p,false);
    if (mode < 3.5) return aurora(uv,p);
    if (mode < 4.5) return stars(uv,p);
    if (mode < 5.5) return sky(uv,p,true);
    if (mode < 6.5) return rain(uv,p);
    if (mode < 7.5) return landscape(p);
    return cosmos(uv,p);
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
    color *= .67 + vignette * .54;
    color = max(vec3(0.0),color + grain * .0025);
    color = color * 2.05 / (vec3(1.0) + color * 2.05);
    gl_FragColor = vec4(color,1.0);
    #include <colorspace_fragment>
  }
`;

const atmosphereValue = (atmosphere: Props['atmosphere'], weather: Props['weather'], seed: number) => {
  if (atmosphere) return { cosmos: 0, ocean: 1, sky: 2, aurora: 3, stars: 4, clouds: 5, rain: 6, landscape: 7 }[atmosphere] ?? 0;
  if (weather === 'rain') return 6;
  if (weather === 'cloud') return 5;
  if (weather === 'clear') return seed % 3 === 0 ? 1 : 7;
  if (weather === 'snow') return 4;
  return 0;
};

export function Atmosphere({ atmosphere, weather = 'none', palette = ['#78939a', '#8e536d'], seed = 7, subdued }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const update = useRef<(mode: number, colors: string[], nextSeed: number) => void>();
  const [fallback, setFallback] = useState(false);
  // Perf: the detail view covers most of the screen; the ambient sky can drop to
  // a few frames per second without anyone noticing. Read via ref so the render
  // loop stays mounted across prop changes.
  const subduedRef = useRef(subdued); subduedRef.current = subdued;

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
      // Perf: octave LOD — the shader evaluates fbm several times per pixel, so
      // dropping two octaves on mobile roughly halves its cost before resolution.
      defines: { OCTAVES: matchMedia('(max-width: 760px)').matches ? 3 : 5 },
      depthWrite: false,
      depthTest: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), material));
    const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const mobile = matchMedia('(max-width: 760px)').matches;
    // Perf: the shader is soft fbm gradients — a lower internal resolution is
    // visually identical after the canvas is stretched, and GPU cost drops with
    // the square of it. This is the single biggest lever on weak GPUs.
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? .66 : 1));
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
      // Perf: 30fps is plenty for a slow-moving sky; 12fps once the editor owns the screen.
      const gap = subduedRef.current ? 1000 / 12 : 1000 / 30;
      if (!visible || document.hidden || time - last < gap) return;
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
    const restored = () => {
      if (disposed) return;
      setFallback(false); last = 0; resize(); frame = requestAnimationFrame(animate);
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    renderer.domElement.addEventListener('webglcontextrestored', restored);
    return () => {
      disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); update.current = undefined;
      renderer.domElement.removeEventListener('webglcontextlost', lost); material.dispose();
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      (scene.children[0] as THREE.Mesh).geometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    update.current?.(atmosphereValue(atmosphere, weather, seed), palette, seed);
  }, [atmosphere, weather, palette.join(','), seed]);

  return <div ref={host} className={`atmosphere ${subdued ? 'atmosphere-subdued' : ''} ${fallback ? 'atmosphere-fallback' : ''}`} aria-hidden="true" />;
}
