import * as THREE from 'three';
import type { WeightedKeyword } from '../../services/memoryArt';

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

type WordBox = { x: number; y: number; w: number; h: number };

const overlaps = (box: WordBox, others: WordBox[]) => others.some(other =>
  box.x < other.x + other.w && box.x + box.w > other.x &&
  box.y < other.y + other.h && box.y + box.h > other.y
);

/** Deterministic, frequency-led packing. Large words establish the shape and small words fill it. */
export function typographyCanvas(words: WeightedKeyword[], seed: number) {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1200;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const rand = seededRandom(seed);
  const vocabulary = words.filter(word => word.text.trim()).slice(0, 42);
  if (!vocabulary.length) vocabulary.push({ text: '此刻', weight: 3 });
  const weights = vocabulary.map(word => word.weight);
  const minWeight = Math.min(...weights), maxWeight = Math.max(...weights);
  const occupied: WordBox[] = [];
  const sizeOf = ({ text, weight }: WeightedKeyword, rank: number) => {
    const relative = maxWeight === minWeight ? .14 * (1 - rank / Math.max(5, vocabulary.length)) :
      Math.log1p(weight - minWeight) / Math.log1p(maxWeight - minWeight);
    const normalized = .12 + relative * .88;
    const size = 30 + Math.pow(normalized, .7) * 154;
    return Math.min(size, 930 / Math.max(text.length, 2));
  };
  const inside = (box: WordBox) => {
    const points = [
      [box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h],
    ];
    return points.every(([x, y]) => contour((x - 600) / 555, (y - 600) / 550, seed) < 1.01);
  };
  const place = (word: string, size: number, x: number, y: number, alpha: number) => {
    ctx.font = `500 ${size}px "Songti SC", "STSong", "SimSun", serif`;
    const width = ctx.measureText(word).width;
    const pad = Math.max(4, size * .035);
    const box = { x: x - width / 2 - pad, y: y - size * .47 - pad, w: width + pad * 2, h: size * .94 + pad * 2 };
    if (!inside(box) || overlaps(box, occupied)) return false;
    occupied.push(box); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(229,237,235,${alpha})`;
    ctx.fillText(word, x, y);
    return true;
  };

  vocabulary.forEach((item, rank) => {
    let size = sizeOf(item, rank);
    const phase = rand() * Math.PI * 2;
    for (let shrink = 0; shrink < 5; shrink++) {
      for (let attempt = 0; attempt < 420; attempt++) {
        const radius = 7.4 * Math.sqrt(attempt);
        const angle = phase + attempt * 2.399963;
        const x = 600 + Math.cos(angle) * radius * (1 + .12 * Math.sin(angle * 3 + seed));
        const y = 600 + Math.sin(angle) * radius * .96;
        const prominence = maxWeight === minWeight ? 0 : (item.weight - minWeight) / (maxWeight - minWeight);
        if (place(item.text, size, x, y, .54 + prominence * .46)) return;
      }
      size *= .86;
    }
  });
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
  const step = text ? (mobile ? 2.8 : 2.2) : (mobile ? 2.7 : 2.05);
  const color = new THREE.Color();
  const add = (x: number,y: number,z: number,r:number,g:number,b:number,e:number,a:number) => {
    positions.push(x,y,z); color.setRGB(r,g,b,THREE.SRGBColorSpace);
    colors.push(color.r,color.g,color.b); edges.push(e); phases.push(rand()); alpha.push(a);
  };
  for(let py=1;py<h-1;py+=step) for(let px=1;px<w-1;px+=step) {
    const ix=Math.floor(px), iy=Math.floor(py), i=(iy*w+ix)*4;
    if(data[i+3]<35) continue;
    const nx=px/w*2-1, ny=1-py/h*2;
    const shape=contour(nx,ny,seed), edge=THREE.MathUtils.smoothstep(shape,.6,1.03);
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
    if((text ? glyphEdge && rand()<.66 : edge>.15 && rand()<edge*.62)) {
      const count=text?3:2;
      for(let j=0;j<count;j++){
        const distance=Math.pow(rand(),1.72)*(.08+edge*.34);
        const stream=Math.sin(y*6+seed%5)*.45;
        add(x+distance*(.34+stream+nx*.58),y+distance*(.82+edge*.48),
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
