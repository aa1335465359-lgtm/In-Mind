import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// Source contracts for the WebGL lifecycle — node cannot run a real GL context,
// so these pin the structural guarantees that keep switching flash-free:
// one persistent renderer, pooled objects, context-loss handling, prompt
// release, and no per-record remounts. Behavioral verification still happens
// in the browser.

const orbit = readFileSync(new URL('../components/memory/Orbit.tsx', import.meta.url), 'utf8');
const atmosphere = readFileSync(new URL('../components/memory/Atmosphere.tsx', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../components/memory/MemoryWorkspace.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('the orbit creates exactly one renderer per mount, never per record', () => {
  assert.equal((orbit.match(/new THREE\.WebGLRenderer/g) || []).length, 1);
  // The mount effect (which owns the teardown) must have empty deps.
  assert.match(orbit, /forceContextLoss\(\); renderer\.domElement\.remove\(\);\s*\};\s*\}, \[\]\);/);
});

test('the orbit handles context loss and releases the GL context on unmount', () => {
  assert.match(orbit, /webglcontextlost/);
  assert.match(orbit, /webglcontextrestored/);
  assert.match(orbit, /forceContextLoss/);
  assert.match(orbit, /renderer\.dispose\(\)/);
  assert.match(orbit, /value\.geometry\.dispose\(\)/);   // cache pruning frees geometries
  assert.match(orbit, /obj\.material\.dispose\(\)/);
});

test('switching rides one continuous track: no per-record keys, no remounts', () => {
  assert.doesNotMatch(workspace, /<Orbit\s+[^>]*key=\{/);
  assert.match(workspace, /onSettle=\{idx =>/);          // React learns the position at settle time
  assert.match(workspace, /snap=\{snapCount\}/);         // jumps snap instead of gliding
  assert.match(orbit, /stepSpring\(spring\.current, targetIndex\.current, dt\)/);
});

test('the pool keeps neighbours alive and preloads beyond them', () => {
  assert.match(orbit, /const REACH = 2;/);
  assert.match(orbit, /freeObjects/);                    // released objects are reused, not recreated
  assert.match(orbit, /MAX_OBJECTS/);
});

test('side planets stay dimmer and smaller through continuous interpolation', () => {
  assert.match(orbit, /focusFactor\(o\)/);
  assert.match(orbit, /planetScale\(o\)/);
  assert.match(orbit, /uFocus/);
});

test('zoom is bounded, smooth, and never switches records', () => {
  assert.match(orbit, /clampZoom\(/);
  assert.match(orbit, /zoom\.current \+= \(zoomTarget\.current - zoom\.current\)/);
  assert.match(orbit, /camera\.position\.z = baseDistance \/ zoom\.current/);
});

test('the retired per-record Planet component is gone and nothing imports it', () => {
  assert.equal(existsSync(new URL('../components/memory/Planet.tsx', import.meta.url)), false);
  assert.match(app, /import\('\.\/components\/memory\/Orbit'\)/);
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
