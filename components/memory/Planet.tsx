import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sampledField, typographyCanvas } from './memoryField';
import type { WeightedKeyword } from '../../services/memoryArt';

export type PlanetMotion = 'idle' | 'enter' | 'exit' | 'dive' | 'return' | 'detail';
interface Props {
  image?: string; palette?: string[]; seed?: number; mood?: string; compact?: boolean;
  keywords?: WeightedKeyword[]; motion?: PlanetMotion; direction?: number; onActivate?: () => void;
  active?: boolean;
}

const vertex = `
  attribute float aEdge; attribute float aPhase; attribute float aAlpha;
  uniform float uTime; uniform float uDive; uniform float uSize;
  varying vec3 vColor; varying float vAlpha; varying float vEdge;
  void main() {
    vec3 p=position;
    // A shared smooth flow field: neighbouring samples move together, not independent jitter.
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
  }
`;
const fragment = `
  varying vec3 vColor; varying float vAlpha; varying float vEdge;
  void main() {
    vec2 q=gl_PointCoord-.5;
    float footprint=1.0-smoothstep(.31,.5,length(q));
    float alpha=footprint*vAlpha;
    if(alpha<.015)discard;
    gl_FragColor=vec4(vColor*(.83+vEdge*.12),alpha);
    #include <colorspace_fragment>
  }
`;

export function Planet({image,seed=7,keywords=[],motion='idle',direction=1,onActivate,active=true}: Props) {
  const host=useRef<HTMLDivElement>(null);
  const target=useRef(motion); target.current=motion;
  const activation=useRef(onActivate); activation.current=onActivate;
  const activeRef=useRef(active); activeRef.current=active;
  const reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [error,setError]=useState(false), [ready,setReady]=useState(false);
  const keywordPayload=JSON.stringify(keywords);
  const latestWords=useRef(keywords); latestWords.current=keywords;
  const rebuildWords=useRef<((words: WeightedKeyword[])=>void)|null>(null);
  const [settledWords,setSettledWords]=useState(keywordPayload);
  // Let typing stay responsive. A settled text change replaces geometry inside the existing context.
  useEffect(()=>{const id=setTimeout(()=>setSettledWords(keywordPayload),700);return()=>clearTimeout(id);},[keywordPayload]);

  useEffect(()=>{
    const mount=host.current;if(!mount)return;
    setError(false);setReady(false);
    let renderer:THREE.WebGLRenderer;
    // Perf: the field is alpha-blended point sprites — MSAA smooths nothing here and
    // only costs memory/bandwidth on mobile.
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});}
    catch{setError(true);return;}
    const mobile=matchMedia('(max-width:760px)').matches;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,30);
    const group=new THREE.Group();scene.add(group);
    const uniforms={uTime:{value:0},uDive:{value:0},uSize:{value:1.3}};
    const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.NormalBlending});
    renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.2:1.5));
    renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;mount.appendChild(renderer.domElement);
    let dead=false,frame=0,last=0,elapsed=0,dive=0,visible=true,baseDistance=5,geometry:THREE.BufferGeometry|undefined,field:THREE.Points|undefined;
    const build=(canvas:HTMLCanvasElement,text:boolean)=>{
      if(dead)return;
      try{
        const nextGeometry=sampledField(canvas,seed,text,mobile);
        if(field){const previous=field.geometry;field.geometry=nextGeometry;previous.dispose();}
        else{field=new THREE.Points(nextGeometry,material);field.frustumCulled=false;group.add(field);}
        geometry=nextGeometry;setReady(true);setError(false);
      }catch{setError(true);}
    };
    let source:HTMLImageElement|undefined;
    if(image){
      source=new Image();source.crossOrigin='anonymous';
      source.onload=()=>{
        if(dead||!source)return;
        const aspect=source.naturalWidth/source.naturalHeight;
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(2,Math.round(aspect>=1?760:760*aspect));canvas.height=Math.max(2,Math.round(aspect>=1?760/aspect:760));
        const ctx=canvas.getContext('2d');if(!ctx){setError(true);return;}
        ctx.drawImage(source,0,0,canvas.width,canvas.height);build(canvas,false);
      };
      source.onerror=()=>{if(!dead)setError(true);};source.src=image;
    }else{
      const make=(words:WeightedKeyword[])=>{if(!dead)build(typographyCanvas(words,seed),true);};
      rebuildWords.current=make;
      // Perf: no synchronous build here. The settled-words effect below fires on
      // mount and builds via requestIdleCallback, so the first workspace frame,
      // the shader compile and the sync engine all get the main thread first.
    }
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=true;controls.dampingFactor=.065;
    controls.minAzimuthAngle=-.38;controls.maxAzimuthAngle=.38;controls.minPolarAngle=1.3;controls.maxPolarAngle=1.84;controls.rotateSpeed=.3;
    const resize=()=>{
      const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;
      renderer.setSize(w,h,false);camera.aspect=w/h;baseDistance=Math.max(4.85,3.65/camera.aspect);
      camera.position.set(0,0,baseDistance);camera.updateProjectionMatrix();
      uniforms.uSize.value=Math.max(1.05,Math.min(2.15,h*renderer.getPixelRatio()/630));
    };
    const ro=new ResizeObserver(resize);ro.observe(mount);resize();
    const io=new IntersectionObserver(items=>{visible=items[0]?.isIntersecting??true;});io.observe(mount);
    let start:{x:number;y:number}|null=null;
    const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY};};
    const cancel=()=>{start=null;};
    const up=(e:PointerEvent)=>{
      if(!start)return;const moved=Math.hypot(e.clientX-start.x,e.clientY-start.y);start=null;
      const box=mount.getBoundingClientRect();
      const x=(e.clientX-box.left)/box.width-.5,y=(e.clientY-box.top)/box.height-.5;
      if(moved<7&&e.button===0&&Math.abs(x)<.34&&Math.abs(y)<.36)activation.current?.();
    };
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
    const animate=(time:number)=>{
      if(dead)return;frame=requestAnimationFrame(animate);
      if(!visible||document.hidden||!activeRef.current){last=time;return;}
      if(time-last<1000/45)return;
      const dt=Math.min((time-last)/1000,.04);last=time;
      const goal=target.current==='dive'||target.current==='detail'?1:0;
      dive=reduced.current?goal:dive+(goal-dive)*(1-Math.exp(-dt*4.8));
      uniforms.uDive.value=dive;
      if(!reduced.current)elapsed+=dt;
      uniforms.uTime.value=elapsed;
      group.rotation.y=Math.sin(elapsed*.19)*.065;
      group.rotation.x=Math.cos(elapsed*.12)*.023;
      group.scale.setScalar(1+dive*.55);group.position.z=dive*.6;
      controls.update();renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(animate);
    const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(frame);setError(true);};
    const restored=()=>{if(dead)return;setError(false);last=0;frame=requestAnimationFrame(animate);};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    renderer.domElement.addEventListener('webglcontextrestored',restored);
    return()=>{
      dead=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();controls.dispose();
      rebuildWords.current=null;
      if(source){source.onload=null;source.onerror=null;}
      renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',restored);
      geometry?.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();
    };
  },[image,seed]);

  useEffect(()=>{
    if(image||!active||!rebuildWords.current)return;
    let cancelled=false;
    const words=JSON.parse(settledWords) as WeightedKeyword[];
    const run=()=>{if(!cancelled)rebuildWords.current?.(words);};
    // A hard timeout keeps the first field from waiting forever on a busy main thread.
    const browserWindow=window as unknown as {requestIdleCallback?:(cb:()=>void,opts:{timeout:number})=>number;cancelIdleCallback?:(id:number)=>void};
    const handle=browserWindow.requestIdleCallback?browserWindow.requestIdleCallback(run,{timeout:600}):window.setTimeout(run,120);
    return()=>{cancelled=true;if(browserWindow.requestIdleCallback)browserWindow.cancelIdleCallback?.(handle);else window.clearTimeout(handle);};
  },[settledWords,image,active]);

  return <div className={`planet-stage planet-motion-${motion} ${ready?'field-ready':''}`} style={{'--direction':direction} as React.CSSProperties}>
    <div className={`planet-poster ${ready&&!error?'poster-hidden':''}`} aria-hidden="true">
      {image?<img src={image} alt=""/>:<span>{keywords.slice(0,4).map(word=>word.text).join(' · ')||'此刻'}</span>}
    </div>
    <div ref={host} className="planet-canvas" role="img" aria-label={image?'照片采样的立体点阵回忆':'从字形笔画生成的立体颗粒回忆'} style={{visibility:error?'hidden':'visible'}}/>
    {!ready&&!error&&<span className="field-loading" role="status">正在显影</span>}
  </div>;
}
