import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Source contracts for the WebGL lifecycle — node cannot run a real GL context,
// so these pin the structural guarantees that keep switching flash-free:
// one renderer per mount, context-loss handling, prompt release, and no
// per-record remounts. Behavioral verification still happens in the browser.

const planet = readFileSync(new URL('../components/memory/Planet.tsx', import.meta.url), 'utf8');
const atmosphere = readFileSync(new URL('../components/memory/Atmosphere.tsx', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../components/memory/MemoryWorkspace.tsx', import.meta.url), 'utf8');

test('planet creates exactly one renderer per mount and never per record', () => {
  assert.equal((planet.match(/new THREE\.WebGLRenderer/g) || []).length, 1);
  // The mount effect (the one owning the renderer teardown) must have empty
  // deps: record switches swap geometry, they must not rebuild the context.
  assert.match(planet, /forceContextLoss\(\);renderer\.domElement\.remove\(\);\s*\};\s*\},\[\]\);/);
});

test('planet handles context loss and releases the GL context on unmount', () => {
  assert.match(planet, /webglcontextlost/);
  assert.match(planet, /webglcontextrestored/);
  assert.match(planet, /forceContextLoss/);
  assert.match(planet, /renderer\.dispose\(\)/);
  assert.match(planet, /geometry\?\.dispose\(\)/);
  assert.match(planet, /material\.dispose\(\)/);
});

test('memory switches reuse the mounted planet instead of remounting it', () => {
  assert.doesNotMatch(workspace, /<Planet\s+key=\{entry\.id\}/);
});

test('atmosphere renderer is created once, survives record switches, and cleans up', () => {
  assert.equal((atmosphere.match(/new THREE\.WebGLRenderer/g) || []).length, 1);
  assert.match(atmosphere, /webglcontextlost/);
  assert.match(atmosphere, /webglcontextrestored/);
  assert.match(atmosphere, /forceContextLoss/);
  assert.match(atmosphere, /atmosphere-fallback/); // dark CSS fallback exists for a dead canvas
});

test('deep color bases stay dark so a dead canvas can never flash white', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  assert.match(css, /\.atmosphere\s*\{[^}]*background:\s*#020303/);
  assert.match(css, /--black:\s*#020303/);
});
