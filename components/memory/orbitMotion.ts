// Pure math for the memory orbit. Extracted from the component so the motion
// contract — continuous gliding, gentle elasticity, bounded zoom — stays
// testable without a WebGL context.

export interface SpringState { offset: number; velocity: number; }

/**
 * Slightly under-damped spring in index units (1.0 = one planet apart).
 * ~0.55s to settle with a barely perceptible ~4% overshoot: enough elasticity
 * to feel physical, never enough to wobble or overshoot into a neighbour.
 */
export const stepSpring = (state: SpringState, target: number, dt: number): SpringState => {
  const stiffness = 42, damping = 9.2;
  const velocity = (state.velocity + (target - state.offset) * stiffness * dt) * Math.exp(-damping * dt);
  return { offset: state.offset + velocity * dt, velocity };
};

export const springSettled = (state: SpringState, target: number): boolean =>
  Math.abs(state.offset - target) < .002 && Math.abs(state.velocity) < .01;

/** Where a track released at the current velocity is heading (lookahead in seconds). */
export const projectFling = (offset: number, velocity: number, lookahead = .16): number =>
  offset + velocity * lookahead;

/** Nearest valid index for a projected track position. */
export const snapIndex = (projected: number, count: number): number =>
  count <= 1 ? 0 : Math.min(count - 1, Math.max(0, Math.round(projected)));

/** Zoom keeps the default view at 1 and is hard-bounded on both ends. */
export const clampZoom = (zoom: number): number => Math.min(1.8, Math.max(.75, zoom));

/** 1 at the centre, ~.55 on the neighbours: brightness / saturation factor. */
export const focusFactor = (offset: number): number => 1 - .45 * Math.min(Math.abs(offset), 1);

/** 1 at the centre, ~.7 on the neighbours: world scale factor. */
export const planetScale = (offset: number): number => 1 - .3 * Math.min(Math.abs(offset), 1.66);
