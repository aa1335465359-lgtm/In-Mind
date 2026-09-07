import DOMPurify from 'dompurify';
import type { JournalEntry } from '../types';

export const PALETTE = ['#e5ef70', '#ed8eaa', '#5168cf'];
export function textOf(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').trim();
}
export function cleanHtml(html: string) {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'], FORBID_ATTR: ['style', 'id'], ADD_DATA_URI_TAGS: ['img'] });
}
export function imageOf(entry: JournalEntry) {
  const candidate = entry.planet?.cover || entry.images?.[0] || new DOMParser().parseFromString(entry.content, 'text/html').querySelector('img')?.getAttribute('src');
  return candidate && /^(https?:|data:image\/)/i.test(candidate) ? candidate : undefined;
}
export function titleOf(entry: JournalEntry) { return entry.title || textOf(entry.content).slice(0, 22) || '还没命名的这一天'; }
export function seedOf(id: string) { return [...id].reduce((n, c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 7); }
export async function paletteOf(file: File): Promise<string[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, 40, 40);
    const bins = new Map<string, { count: number; r: number; g: number; b: number }>();
    const pixels = ctx.getImageData(0, 0, 40, 40).data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (Math.max(r, g, b) < 25 || Math.min(r, g, b) > 235) continue;
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      const item = bins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      item.count++; item.r += r; item.g += g; item.b += b; bins.set(key, item);
    }
    const selected: number[][] = [];
    for (const item of [...bins.values()].sort((a, b) => b.count - a.count)) {
      const rgb = [item.r, item.g, item.b].map(v => Math.round(v / item.count));
      if (selected.every(other => rgb.reduce((sum, v, i) => sum + (v - other[i]) ** 2, 0) > 5000)) selected.push(rgb);
      if (selected.length === 3) break;
    }
    return [...selected.map(rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')), ...PALETTE].slice(0, 3);
  } finally { bitmap.close(); }
}
