import * as THREE from 'three';

export function seededRandom(seed: number) {
  let n = seed || 1;
  return () => ((n = (1664525 * n + 1013904223) >>> 0) / 4294967296);
}

/** Continuous irregular contour, not a hard polygon clip. Independent of time. */
export function contour(x: number, y: number, seed: number) {
  const angle = Math.atan2(y, x);
  const radius = Math.pow(Math.pow(Math.abs(x), 3.4) + Math.pow(Math.abs(y), 3.4), 1 / 3.4);
  return radius / (.91 + .055 * Math.sin(angle * 3 + seed % 7) + .035 * Math.cos(angle * 7 - .8));
}

export function typographyCanvas(words: string[], seed: number) {
  const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1100;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRandom(seed);
  const vocabulary = [...new Set(words.filter(Boolean))].slice(0, 24);
  if (!vocabulary.length) vocabulary.push('此刻', '记忆', '时间');
  const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
  const place = (word: string, size: number, x: number, y: number, alpha: number, force = false) => {
    ctx.font = `400 ${size}px "Noto Serif SC", "Songti SC", serif`;
    const width = ctx.measureText(word).width;
    const box = { x: x - width / 2 - 10, y: y - size / 2 - 9, w: width + 20, h: size + 18 };
    if (box.x < 60 || box.x + box.w > 940 || box.y < 60 || box.y + box.h > 1040) return false;
    if (!force && occupied.some(b => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) return false;
    occupied.push(box); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(222,234,233,${alpha})`; ctx.fillText(word, x, y); return true;
  };
  // Three unmistakable anchors; no repeated wall of equally weighted words.
  vocabulary.slice(0,3).forEach((word, i) => {
    const size = Math.min([174,118,84][i], 770 / Math.max(word.length, 2));
    place(word, size, [465,545,435][i], [450,620,310][i], [1,.9,.8][i], true);
  });
  for (let i = 3; i < Math.max(vocabulary.length, 12); i++) {
    const word = vocabulary[i % vocabulary.length];
    for (let attempt = 0; attempt < 55; attempt++) {
      const x = 135 + rand() * 730, y = 115 + rand() * 860;
      if (contour((x-500)/470, (y-550)/510, seed) > .97) continue;
      if (place(word, 22 + rand() * 23, x, y, .45 + rand() * .3)) break;
    }
  }
  return canvas;
}

export function sampledField(canvas: HTMLCanvasElement, seed: number, text: boolean, mobile: boolean) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0,0,w,h).data, rand = seededRandom(seed);
  const positions: number[] = [], colors: number[] = [], edges: number[] = [], phases: number[] = [], alpha: number[] = [];
  const aspect = w / h;
  const width = aspect > 1 ? 2.05 : 2.05 * aspect;
  const height = aspect > 1 ? 2.05 / aspect : 2.05;
  const step = text ? (mobile ? 2.4 : 1.9) : (mobile ? 2.3 : 1.7);
  const color = new THREE.Color();
  const add = (x: number,y: number,z: number,r:number,g:number,b:number,e:number,a:number) => {
    positions.push(x,y,z); color.setRGB(r,g,b,THREE.SRGBColorSpace);
    colors.push(color.r,color.g,color.b); edges.push(e); phases.push(rand()); alpha.push(a);
  };
  for(let py=1;py<h-1;py+=step) for(let px=1;px<w-1;px+=step) {
    const ix=Math.floor(px), iy=Math.floor(py), i=(iy*w+ix)*4;
    if(data[i+3]<35) continue;
    const nx=px/w*2-1, ny=1-py/h*2;
    const shape=contour(nx,ny,seed), edge=THREE.MathUtils.smoothstep(shape,.67,1.08);
    if(!text && shape > 1.12) continue;
    const opacity=text ? data[i+3]/255 : 1-THREE.MathUtils.smoothstep(shape,.86,1.12);
    if(opacity<.015)continue;
    const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255, l=.299*r+.587*g+.114*b;
    const z=text ? .28*Math.max(0,1-nx*nx*.65-ny*ny*.58) + .04*Math.sin(ny*4+nx*2) :
      .2*(1-nx*nx*.6-ny*ny*.5)+(l-.5)*.23;
    const x=nx*width/2, y=ny*height/2;
    add(x,y,z,r,g,b,edge,opacity*(text? .92:.9));
    // Emit fragments from actual glyph strokes / photo samples, never an unrelated dust ring.
    const glyphEdge=text && (data[i-4+3]<80 || data[i+4+3]<80 || data[i-w*4+3]<80 || data[i+w*4+3]<80);
    if((text ? glyphEdge && rand()<.52 : edge>.15 && rand()<edge*.7)) {
      const count=text?3:2;
      for(let j=0;j<count;j++){
        const distance=Math.pow(rand(),1.8)*(.09+edge*.26);
        const stream=Math.sin(y*6+seed%5)*.45;
        add(x+distance*(.28+stream+nx*.48),y+distance*(.8+edge*.45),
          z+(rand()-.5)*distance*1.8,r,g,b,Math.max(edge,.6),opacity*(1-distance*2)*.4);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('aEdge',new THREE.Float32BufferAttribute(edges,1));
  geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
  geometry.setAttribute('aAlpha',new THREE.Float32BufferAttribute(alpha,1));
  return geometry;
}

