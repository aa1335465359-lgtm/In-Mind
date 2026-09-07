import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { PALETTE } from '../../services/memoryArt';

export type PlanetMotion = 'idle' | 'enter' | 'exit';

interface Props {
  image?: string;
  palette?: string[];
  seed?: number;
  mood?: string;
  compact?: boolean;
  keywords?: string[];
  motion?: PlanetMotion;
  onActivate?: () => void;
}

const dustVertex = `
  attribute float aSize;
  attribute float aFade;
  attribute float aPhase;
  uniform float uTime;
  uniform float uBurst;
  varying float vFade;
  varying float vPhase;
  void main() {
    vec3 alive = position;
    vec2 direction = normalize(position.xy + vec2(.0001));
    float wind = sin(uTime * .55 + position.y * 3.7 + aPhase * 6.2831);
    alive.xy += direction * uBurst * (.24 + aPhase * .95);
    alive.z += (aPhase - .5) * uBurst * 1.7;
    alive.x += wind * (.008 + aFade * .025);
    alive.y += cos(uTime * .31 + position.x * 3.4) * aFade * .012;
    vec4 mv = modelViewMatrix * vec4(alive, 1.0);
    vFade = aFade * mix(1.0, .38, uBurst);
    vPhase = aPhase;
    gl_PointSize = aSize * (1.0 + uBurst * .8) * min(1.45, 6.3 / max(2.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const dustFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  varying float vPhase;
  void main() {
    vec2 q = gl_PointCoord - .5;
    float shard = max(abs(q.x) + abs(q.y), abs(q.x * .72 + q.y * .3));
    float alpha = smoothstep(.52, .16, shard) * vFade * uOpacity;
    if (alpha < .012) discard;
    gl_FragColor = vec4(uColor * mix(.72,1.12,vPhase), alpha);
  }
`;

function randomFrom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeDust(count: number, seed: number, color: string, mobile: boolean, opacity: number, clocks: Array<{ value: number }>, bursts: Array<{ value: number }>) {
  const rand = randomFrom(seed);
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count), fades = new Float32Array(count), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2, band = Math.pow(rand(), 2.7);
    const radius = .76 + band * (.32 + rand() * .14);
    positions[i * 3] = Math.cos(angle) * radius * (1 + (rand() - .5) * .11);
    positions[i * 3 + 1] = Math.sin(angle) * radius * (.88 + rand() * .12) + (rand() - .5) * .11;
    positions[i * 3 + 2] = (rand() - .5) * (.55 + band * .55);
    sizes[i] = (mobile ? .54 : .68) + rand() * (mobile ? .82 : 1.08);
    fades[i] = .08 + (1 - band) * .42 * rand(); phases[i] = rand();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 }, uBurst: { value: 0 } },
    vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  clocks.push(material.uniforms.uTime); bursts.push(material.uniforms.uBurst);
  return new THREE.Points(geometry, material);
}

function makeKeywordTexture(words: string[], seed: number) {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 768;
  const context = canvas.getContext('2d')!; const rand = randomFrom(seed + 909);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center'; context.textBaseline = 'middle';
  const vocabulary = words.length ? words : ['此刻', '回忆', '时间', 'IN MIND'];
  const rows = 10;
  for (let row = 0; row < rows; row++) {
    const y = 54 + row * 73 + (rand() - .5) * 18;
    const count = row === 0 || row === rows - 1 ? 7 : 10;
    for (let column = 0; column < count; column++) {
      const word = vocabulary[(row * 7 + column * 3) % vocabulary.length];
      const importance = 1 - Math.min(vocabulary.indexOf(word), 10) / 14;
      const size = Math.round(21 + importance * 31 + rand() * 17);
      const x = (column + .5) * canvas.width / count + (rand() - .5) * 32;
      context.font = `${rand() > .72 ? 500 : 350} ${size}px "Noto Serif SC", "Songti SC", serif`;
      context.fillStyle = `rgba(${Math.round(195 + rand() * 45)},${Math.round(211 + rand() * 32)},${Math.round(210 + rand() * 31)},${(.5 + importance * .42).toFixed(2)})`;
      context.fillText(word, x, y);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

function makeTextPlanet(words: string[], seed: number, palette: string[], mobile: boolean, clocks: Array<{ value: number }>, bursts: Array<{ value: number }>, textures: THREE.Texture[]) {
  const group = new THREE.Group();
  const texture = makeKeywordTexture(words, seed); textures.push(texture);
  const uniforms = { uMap: { value: texture }, uTime: { value: 0 }, uBurst: { value: 0 }, uTint: { value: new THREE.Color(palette[0] || '#dbe7e5') } };
  clocks.push(uniforms.uTime); bursts.push(uniforms.uBurst);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.78, mobile ? 58 : 88, mobile ? 38 : 58), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime; uniform float uBurst; varying vec2 vUv; varying float vRim;
      void main(){
        vUv=uv; float breath=sin(uTime*.36+position.y*5.0)*.006;
        vec3 alive=position+normal*(breath+uBurst*(.18+.22*abs(sin(uv.x*31.0))));
        vec4 mv=modelViewMatrix*vec4(alive,1.0); vRim=1.0-abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)));
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform float uBurst; varying vec2 vUv; varying float vRim;
      void main(){
        vec4 ink=texture2D(uMap,vUv); float alpha=ink.a*(.78+vRim*.22)*(1.0-uBurst*.65);
        if(alpha<.06)discard; vec3 color=mix(ink.rgb,uTint,vRim*.18); gl_FragColor=vec4(color,alpha);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  group.add(sphere);
  const halo = makeDust(mobile ? 620 : 1300, seed + 81, palette[0] || '#b8c8c5', mobile, .34, clocks, bursts);
  halo.scale.set(.83,.83,.83); group.add(halo);
  return group;
}

function photoMaterials(texture: THREE.Texture, palette: string[], seed: number, imageAspect: number, clocks: Array<{ value: number }>, bursts: Array<{ value: number }>) {
  const uniforms = {
    uMap: { value: texture }, uTint: { value: new THREE.Color(palette[0] || '#dce8e5') },
    uAccent: { value: new THREE.Color(palette[1] || '#b0d7df') }, uSeed: { value: (seed % 997) / 997 },
    uTime: { value: 0 }, uBurst: { value: 0 }, uImageAspect: { value: imageAspect }, uFrameAspect: { value: 1.9 / 2.25 },
  };
  clocks.push(uniforms.uTime); bursts.push(uniforms.uBurst);
  const common = `
    vec2 coverUv(vec2 raw) {
      vec2 mapped=raw;
      if(uImageAspect>uFrameAspect) mapped.x=(raw.x-.5)*(uFrameAspect/uImageAspect)+.5;
      else mapped.y=(raw.y-.5)*(uImageAspect/uFrameAspect)+.5;
      return mapped;
    }
    float faceted(vec2 p) {
      p-=.5; p.x*=.985;
      float box=max(abs(p.x)/.475,abs(p.y)/.485);
      float cutA=abs(p.x+p.y*.96)/.745;
      float cutB=abs(p.x-p.y*1.04)/.77;
      return max(box,max(cutA,cutB));
    }
  `;
  const plane = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform sampler2D uMap; uniform float uTime; uniform float uBurst; uniform float uImageAspect; uniform float uFrameAspect;
      varying vec2 vUv; varying float vShape; varying float vLuma;
      ${common}
      void main(){
        vUv=coverUv(uv); vec3 rgb=texture2D(uMap,vUv).rgb; vLuma=dot(rgb,vec3(.299,.587,.114)); vShape=faceted(uv);
        vec3 alive=position; float wind=sin(uTime*.38+position.y*4.0+position.x*1.7);
        float edge=smoothstep(.74,1.0,vShape);
        alive.z+=(vLuma-.48)*.3+wind*(.006+edge*.012)+(vShape-.45)*uBurst*.3;
        alive.xy*=1.0+uBurst*(.12+edge*.16);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(alive,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform vec3 uAccent; uniform float uTime; uniform float uBurst; uniform float uImageAspect; uniform float uFrameAspect;
      varying vec2 vUv; varying float vShape; varying float vLuma;
      void main(){
        float mask=1.0-smoothstep(.968,1.012,vShape); if(mask<.015)discard;
        vec3 src=texture2D(uMap,vUv).rgb;
        float micro=sin(gl_FragCoord.x*.86+sin(gl_FragCoord.y*.17))*sin(gl_FragCoord.y*.72)*.5+.5;
        float edge=smoothstep(.78,1.0,vShape);
        vec3 grade=mix(src,mix(vec3(vLuma),src,.72),.16);
        grade=mix(grade,mix(uTint,uAccent,vLuma),edge*.06);
        grade*=.96+micro*.055*edge;
        float reveal=1.0-smoothstep(.12,.72,uBurst);
        gl_FragColor=vec4(grade,mask*reveal);
      }
    `,
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
  });
  const points = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform sampler2D uMap; uniform float uSeed; uniform float uTime; uniform float uBurst; uniform float uImageAspect; uniform float uFrameAspect;
      varying vec2 vUv; varying float vLuma; varying float vEdge; varying float vLife;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*83.0)*43758.5453);}
      ${common}
      void main(){
        vUv=coverUv(uv); vec3 rgb=texture2D(uMap,vUv).rgb; vLuma=dot(rgb,vec3(.299,.587,.114));
        float shape=faceted(uv); vEdge=smoothstep(.69,1.06,shape); vLife=hash(uv*23.7);
        vec2 p=uv-.5; vec2 direction=normalize(p+vec2(.0001)); vec3 alive=position;
        float breeze=sin(uTime*.52+position.y*4.6+vLife*6.2831);
        alive.z+=(vLuma-.46)*.43+(vLife-.5)*vEdge*.19;
        alive.xy+=direction*vEdge*(.012+vLife*.08)+vec2(breeze,sin(uTime*.29+position.x*3.8))*vEdge*.012;
        alive.xy+=direction*uBurst*(.28+vLife*.95); alive.z+=(vLife-.5)*uBurst*1.55;
        vec4 mv=modelViewMatrix*vec4(alive,1.0);
        gl_PointSize=(.46+vLuma*.72+vEdge*.48)*(1.0+uBurst*.72)*min(1.38,5.9/max(2.0,-mv.z));
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uTint; uniform vec3 uAccent; uniform float uBurst;
      varying vec2 vUv; varying float vLuma; varying float vEdge; varying float vLife;
      void main(){
        vec2 q=gl_PointCoord-.5; float shard=abs(q.x)+abs(q.y*.82); if(shard>.5)discard;
        vec3 src=texture2D(uMap,vUv).rgb; vec3 color=mix(src,mix(uTint,uAccent,vLife),.05+vEdge*.12);
        float alpha=smoothstep(.5,.12,shard)*mix(.018,.56,vEdge)*(.44+vLuma*.56)*mix(1.0,.64,uBurst);
        if(alpha<.012)discard; gl_FragColor=vec4(color,alpha);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  return { plane, points };
}

export function Planet({ image, palette = PALETTE, seed = 7, mood, compact, keywords = [], motion = 'idle', onActivate }: Props) {
  const host = useRef<HTMLDivElement>(null), motionRef = useRef(motion), activateRef = useRef(onActivate);
  const [fallback, setFallback] = useState(false), [photoError, setPhotoError] = useState(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pauseRef = useRef(paused); pauseRef.current = paused; motionRef.current = motion; activateRef.current = onActivate;
  const resetRef = useRef<() => void>();
  const colors = palette.join(',');

  useEffect(() => {
    const mount = host.current; if (!mount) return;
    setFallback(false); setPhotoError(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { setFallback(true); return; }
    let disposed = false, frame = 0, visible = true, last = 0;
    let burst = motionRef.current === 'enter' ? 1 : 0;
    const mobile = matchMedia('(max-width: 760px)').matches;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(31,1,.1,30);
    camera.position.set(0,.03,compact ? 5.75 : 5.6);
    renderer.setClearColor(0x000000,0); renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.65));
    renderer.outputColorSpace=THREE.SRGBColorSpace; mount.appendChild(renderer.domElement);

    const clocks: Array<{value:number}>=[], bursts: Array<{value:number}>=[], textures: THREE.Texture[]=[];
    const object=new THREE.Group(); object.scale.setScalar(.96); object.position.y=.08; scene.add(object);
    const cloud=new THREE.Group();
    cloud.add(makeDust(mobile?750:1650,seed+19,'#c6d1cf',mobile,.35,clocks,bursts));
    const accentDust=makeDust(mobile?210:470,seed+311,palette[1]||'#718e91',mobile,.22,clocks,bursts);
    accentDust.scale.set(1.05,1.03,1.05); accentDust.rotation.z=.13; cloud.add(accentDust); object.add(cloud);

    if(image){
      new THREE.TextureLoader().setCrossOrigin('anonymous').load(image,texture=>{
        if(disposed){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace; texture.minFilter=THREE.LinearFilter; texture.magFilter=THREE.LinearFilter; textures.push(texture);
        const rawAspect=texture.image.width/texture.image.height;
        const geometry=new THREE.PlaneGeometry(1.9,2.25,mobile?104:170,mobile?124:202);
        const materials=photoMaterials(texture,palette,seed,rawAspect,clocks,bursts);
        const plane=new THREE.Mesh(geometry.clone(),materials.plane); plane.position.z=-.08;
        object.add(plane,new THREE.Points(geometry,materials.points));
      },undefined,()=>{if(!disposed)setPhotoError(true);});
    }else object.add(makeTextPlanet(keywords,seed,palette,mobile,clocks,bursts,textures));

    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableZoom=false; controls.enablePan=false; controls.enableDamping=true; controls.dampingFactor=.06;
    controls.minAzimuthAngle=-.34; controls.maxAzimuthAngle=.34; controls.minPolarAngle=1.35; controls.maxPolarAngle=1.79; controls.rotateSpeed=.32;
    controls.saveState(); resetRef.current=()=>controls.reset();
    let pointerStart: {x:number;y:number}|null=null;
    const pointerDown=(event:PointerEvent)=>{pointerStart={x:event.clientX,y:event.clientY};};
    const pointerUp=(event:PointerEvent)=>{
      if(!pointerStart)return; const distance=Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y); pointerStart=null;
      if(distance<7&&event.button===0)activateRef.current?.();
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown); renderer.domElement.addEventListener('pointerup',pointerUp);
    const resize=()=>{
      const width=mount.clientWidth,height=mount.clientHeight;if(!width||!height)return;
      renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=width/height<.72?6.15:compact?5.75:5.6;camera.updateProjectionMatrix();
    };
    const ro=new ResizeObserver(resize);ro.observe(mount);resize();
    const io=new IntersectionObserver(items=>{visible=items[0]?.isIntersecting??true;});io.observe(mount);
    const pace=mood==='疲惫'?.000018:mood==='兴奋'||mood==='开心'?.00005:.000032;
    const animate=(time:number)=>{
      if(disposed)return;frame=requestAnimationFrame(animate);
      if(!visible||document.hidden||time-last<1000/40)return;
      const dt=Math.min((time-last)/1000,.05);last=time;
      const target=motionRef.current==='exit'?1:0;
      burst+=(target-burst)*(1-Math.exp(-dt*(target?5.3:3.8)));
      for(const uniform of bursts)uniform.value=burst;
      object.scale.setScalar(.96*(1+burst*.11));
      if(!pauseRef.current){
        object.rotation.y=Math.sin(time*.0001)*.06;object.rotation.x=Math.cos(time*.000075)*.012;
        cloud.rotation.z+=pace*dt*60;cloud.rotation.y=Math.sin(time*.00008)*.045;
        for(const clock of clocks)clock.value=time/1000;
      }
      controls.update();renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(animate);
    const lost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(frame);setFallback(true);};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{
      disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('webglcontextlost',lost);
      scene.traverse(child=>{const rendered=child as THREE.Mesh;rendered.geometry?.dispose();if(rendered.material)(Array.isArray(rendered.material)?rendered.material:[rendered.material]).forEach(material=>material.dispose());});
      textures.forEach(texture=>texture.dispose());renderer.dispose();renderer.domElement.remove();resetRef.current=undefined;
    };
  // Keyword texture intentionally refreshes on remount (enter/return), not on every editor keystroke.
  },[image,colors,seed,compact,mood]);

  return <div className={`planet-stage ${compact?'planet-compact':''} planet-motion-${motion}`}>
    <div ref={host} className="planet-canvas" role="img" aria-label={image?'可转动的照片粒子记忆体':'由回忆关键词组成的文字星球'} style={{visibility:fallback?'hidden':'visible'}} />
    {fallback&&<div className="planet-fallback">{image?<img src={image} alt="回忆原图"/>:<span>{keywords.slice(0,5).join(' · ')||'IN MIND'}</span>}<p>静态呈现</p></div>}
    {!compact&&<div className="planet-tools"><span>{photoError?'照片没有载入，记录内仍保留原图':fallback?'当前设备使用静态呈现':'轻触进入，拖动观察深度'}</span><button aria-label={paused?'播放动态':'暂停动态'} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><button aria-label="回到正面" onClick={()=>resetRef.current?.()}><RotateCcw size={15}/></button></div>}
  </div>;
}
