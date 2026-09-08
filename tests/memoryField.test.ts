import test from 'node:test';
import assert from 'node:assert/strict';
import { contour, sampledField } from '../components/memory/memoryField';

function canvas(width: number, height: number, ink = false) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    data[i] = 180; data[i+1] = 160; data[i+2] = 140;
    data[i+3] = !ink || (x > width*.3 && x < width*.65 && y > height*.2 && y < height*.8) ? 255 : 0;
  }
  return {width, height, getContext: () => ({getImageData: () => ({data})})} as unknown as HTMLCanvasElement;
}

test('contour is stable but not a circle or regular octagon', () => {
  assert.equal(contour(.7,.4,77), contour(.7,.4,77));
  assert.notEqual(contour(.8,0,77), contour(0,.8,77));
  assert.equal(contour(0,0,77), 0);
});

test('photo sampling is deterministic and all particle attributes remain finite', () => {
  const a=sampledField(canvas(90,120),44,false,true);
  const b=sampledField(canvas(90,120),44,false,true);
  assert.deepEqual(a.getAttribute('position').array,b.getAttribute('position').array);
  for(const name of ['position','color','aEdge','aPhase','aAlpha']) {
    assert.ok(Array.from(a.getAttribute(name).array).every(Number.isFinite));
    assert.equal(a.getAttribute(name).count,a.getAttribute('position').count);
  }
  a.dispose();b.dispose();
});

test('glyph particles come only from opaque ink and have multiple depth values', () => {
  const shape=sampledField(canvas(120,120,true),7,true,false);
  const position=shape.getAttribute('position');
  assert.ok(position.count>0);
  assert.ok(new Set(Array.from({length:position.count},(_,i)=>position.getZ(i).toFixed(3))).size>10);
  // No unrelated surrounding spherical dust shell.
  for(let i=0;i<position.count;i++) assert.ok(Math.abs(position.getX(i))<.8);
  shape.dispose();
});

test('different photo ratios keep the same longest dimension before edge trails', () => {
  for(const [w,h] of [[160,80],[80,160],[120,120]]) {
    const g=sampledField(canvas(w,h),13,false,true);g.computeBoundingBox();
    assert.ok(g.boundingBox!.max.x-g.boundingBox!.min.x<2.8);
    assert.ok(g.boundingBox!.max.y-g.boundingBox!.min.y<2.8);
    g.dispose();
  }
});
