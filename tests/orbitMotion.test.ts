import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampZoom, focusFactor, planetScale, projectFling, snapIndex, springSettled, stepSpring, type SpringState } from '../components/memory/orbitMotion';

test('the track spring glides to the target with gentle elasticity only', () => {
  let state: SpringState = { offset: 0, velocity: 0 };
  let peak = 0, steps = 0;
  for (; steps < 600; steps++) {
    state = stepSpring(state, 1, 1 / 60);
    peak = Math.max(peak, state.offset - 1);
    if (springSettled(state, 1)) break;
  }
  assert.ok(steps < 600, 'spring must settle');
  assert.ok(Math.abs(state.offset - 1) < .01);
  assert.ok(peak > 0 && peak < .06, `overshoot should be perceptible but tiny, got ${peak}`);
  assert.ok(Math.abs(state.velocity) < .05);
});

test('a fling projects along the velocity and snaps to a valid index', () => {
  assert.equal(snapIndex(projectFling(2.1, 4), 10), 3);   // moving forward lands ahead
  assert.equal(snapIndex(projectFling(2.4, -6), 10), 1);  // backward fling steps back (2.4 - .96 → 1)
  assert.equal(snapIndex(projectFling(0.2, -40), 10), 0); // clamped at the first record
  assert.equal(snapIndex(projectFling(8.9, 40), 10), 9);  // clamped at the last record
  assert.equal(snapIndex(3.7, 0), 0);                     // degenerate list
});

test('zoom stays inside the [0.75, 1.8] window', () => {
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(.2), .75);
  assert.equal(clampZoom(9), 1.8);
  assert.equal(clampZoom(.749), .75);
});

test('side planets sit at ~70% scale and ~55% focus, centre untouched', () => {
  assert.equal(focusFactor(0), 1);
  assert.equal(planetScale(0), 1);
  assert.ok(Math.abs(focusFactor(1) - .55) < 1e-9);
  assert.ok(planetScale(1) >= .65 && planetScale(1) <= .75);
  // Interpolation stays continuous and monotone away from the centre.
  assert.ok(focusFactor(.5) > focusFactor(1));
  assert.ok(planetScale(.5) > planetScale(1));
});

test('rapid retargets merge without exploding', () => {
  let state: SpringState = { offset: 0, velocity: 0 };
  for (let i = 0; i < 30; i++) state = stepSpring(state, 3, 1 / 60);
  state = stepSpring(state, 7, 1 / 60);   // mid-flight retarget
  let max = 0;
  for (let i = 0; i < 300; i++) { state = stepSpring(state, 7, 1 / 60); max = Math.max(max, Math.abs(state.offset)); }
  assert.ok(Math.abs(state.offset - 7) < .01);
  assert.ok(max < 12, 'retarget must stay bounded');
});
