import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { PALETTE } from '../../services/memoryArt';
import type { JournalEntry } from '../../types';

interface Props { image?: string; palette?: string[]; seed?: number; weather?: JournalEntry['weather']; mood?: string; compact?: boolean; }
export function Planet({ image, palette = PALETTE, seed = 7, weather = 'none', mood, compact }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pauseRef = useRef(paused); pauseRef.current = paused;
  const resetRef = useRef<() => void>();
  const colors = palette.join(',');
  useEffect(() => {
    const mount = host.current; if (!mount) return;
    setFallback(false); setPhotoError(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFallback(true); return; }
    let disposed = false, frame = 0, visible = true;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 40); camera.position.set(0, .25, 6.5);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment(); const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture; room.dispose(); pmrem.dispose();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .07;
    controls.minPolarAngle = .65; controls.maxPolarAngle = 2.4;
    controls.rotateSpeed = .55;
    resetRef.current = () => { controls.reset(); };
    const key = new THREE.DirectionalLight('#fff3de', 4); key.position.set(-3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight('#b2b7ff', 2.5); rim.position.set(3, 1, -2); scene.add(rim);
    scene.add(new THREE.AmbientLight('#e2e5fb', .7));
    const sculpture = new THREE.Group(); sculpture.rotation.z = -.22; scene.add(sculpture);
    const material = new THREE.MeshPhysicalMaterial({ color: palette[0], roughness: .3, metalness: .1, clearcoat: 1, clearcoatRoughness: .16 });
    // Object-space color planes and local halftone texture, not a random particle ball.
    material.onBeforeCompile = shader => {
      shader.uniforms.popA = { value: new THREE.Color(palette[0]) };
      shader.uniforms.popB = { value: new THREE.Color(palette[1] || PALETTE[1]) };
      shader.uniforms.popC = { value: new THREE.Color(palette[2] || PALETTE[2]) };
      shader.vertexShader = 'varying vec3 vObject;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObject = position;');
      shader.fragmentShader = 'uniform vec3 popA; uniform vec3 popB; uniform vec3 popC; varying vec3 vObject;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float band = vObject.y + .28 * sin(vObject.x * 2.5 + ${((seed % 100) / 30).toFixed(3)});
        vec3 ink = mix(popC, popA, smoothstep(-.3, -.24, band));
        ink = mix(ink, popB, smoothstep(.48, .52, band));
        vec2 dotUV = fract(vObject.xz * 20.0) - .5;
        float dotMask = 1.0 - smoothstep(.11, .18, length(dotUV));
        ink *= 1.0 - dotMask * .35 * (1.0 - smoothstep(-.4, -.3, band));
        diffuseColor.rgb = ink;
      `);
    };
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.08, 96, 64), material); sculpture.add(orb);
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#dbdcdc', metalness: .92, roughness: .18, clearcoat: 1 });
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.47, .037, 16, 160), chrome);
    orbit.rotation.set(1.13, -.15, -.25); sculpture.add(orbit);
    const pinkOrbit = new THREE.Mesh(new THREE.TorusGeometry(1.50, .012, 10, 160), new THREE.MeshStandardMaterial({ color: palette[1] || PALETTE[1], metalness: .25, roughness: .4 }));
    pinkOrbit.rotation.copy(orbit.rotation); pinkOrbit.position.y = .07; sculpture.add(pinkOrbit);
    const satellite = new THREE.Mesh(new THREE.SphereGeometry(.12, 24, 20), chrome); satellite.position.set(-1.55, .68, .15); sculpture.add(satellite);
    const wafer = new THREE.Mesh(new THREE.TorusGeometry(.22, .075, 12, 48), new THREE.MeshPhysicalMaterial({ color: palette[1] || PALETTE[1], roughness: .23, clearcoat: 1 }));
    wafer.position.set(1.45, -.57, .25); wafer.rotation.x = .65; sculpture.add(wafer);
    const textures: THREE.Texture[] = [];
    if (image) {
      new THREE.TextureLoader().setCrossOrigin('anonymous').load(image, texture => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.push(texture);
        const aspect = texture.image.width / texture.image.height;
        const width = aspect > 1 ? 1.55 : 1.15;
        const height = Math.min(1.48, width / aspect);
        const surface = new THREE.PlaneGeometry(width, height, 40, 40);
        const pos = surface.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i);
          pos.setZ(i, Math.sqrt(Math.max(.1, 1.10 ** 2 - x * x - y * y)));
        }
        surface.computeVertexNormals();
        const photo = new THREE.Mesh(surface, new THREE.MeshPhysicalMaterial({ map: texture, roughness: .42, clearcoat: .65, side: THREE.DoubleSide }));
        photo.rotation.z = .12; sculpture.add(photo);
      }, undefined, () => { if (!disposed) setPhotoError(true); });
    }
    const weatherGroup = new THREE.Group(); scene.add(weatherGroup);
    const positions: number[] = [];
    let n = seed || 1;
    const rand = () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
    const count = weather === 'rain' ? 80 : weather === 'snow' ? 65 : 0;
    for (let i = 0; i < count; i++) positions.push((rand() - .5) * 4.2, (rand() - .5) * 3.5, (rand() - .5) * 2.8);
    const weatherGeo = new THREE.BufferGeometry(); weatherGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const dust = new THREE.Points(weatherGeo, new THREE.PointsMaterial({ color: '#dddbea', size: weather === 'snow' ? .028 : .014, transparent: true, opacity: .6, depthWrite: false }));
    weatherGroup.add(dust);
    if (weather === 'cloud') scene.fog = new THREE.FogExp2('#191b20', .06);
    if (weather === 'clear') key.color.set('#ffe4a0');
    const resize = () => { const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.position.z = w / h < .85 ? 7.8 : 6.5; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const intersection = new IntersectionObserver(items => { visible = items[0].isIntersecting; }); intersection.observe(mount);
    let last = 0;
    const animate = (time: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || time - last < 1000 / 35) return;
      const dt = Math.min((time - last) / 1000, .04); last = time;
      if (!pauseRef.current) {
        // Bounded movement keeps the photographic window facing the viewer.
        sculpture.rotation.y = Math.sin(time * .00014) * .18;
        satellite.position.y = .68 + Math.sin(time * .0005) * .025;
        const attr = weatherGeo.getAttribute('position');
        for (let i = 0; i < count; i++) { let y = attr.getY(i) - dt * (weather === 'rain' ? 1.7 : .16); if (y < -1.8) y = 1.8; attr.setY(i, y); }
        attr.needsUpdate = true;
      }
      controls.update(); renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setFallback(true); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls.dispose();
      scene.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose()); });
      textures.forEach(t => t.dispose()); environment.dispose(); renderer.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.domElement.remove(); resetRef.current = undefined;
    };
  }, [image, colors, seed, weather]);
  return <div className={`planet-stage ${compact ? 'planet-compact' : ''}`}>
    <div ref={host} className="planet-canvas" role="img" aria-label="可拖动旋转的照片记忆星球" style={{ visibility: fallback ? 'hidden' : 'visible' }} />
    {fallback && <div className="planet-fallback">{image ? <img src={image} alt="回忆原图" /> : <span>IN MIND<br /><small>你的下一段回忆</small></span>}<p>静态阅读模式</p></div>}
    {!compact && <><div className="planet-caption"><span>MEMORY OBJECT / {String(seed % 10000).padStart(4, '0')}</span><span>{mood || '未标记心情'}</span></div><div className="planet-tools"><span>{photoError ? '照片暂未载入，可在详情查看原图' : fallback ? '此设备已使用静态展示' : '拖动，换个角度看回忆'}</span><button aria-label={paused ? '播放动态' : '暂停动态'} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button><button aria-label="恢复星球视角" onClick={() => resetRef.current?.()}><RotateCcw size={15} /></button></div></>}
  </div>;
}
