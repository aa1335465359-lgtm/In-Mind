export const EPHEMERAL_LIFETIME_MS = 60_000;

export const ephemeralRemaining = (openedAt: number, now = Date.now()) =>
  Math.max(0, Math.ceil((openedAt + EPHEMERAL_LIFETIME_MS - now) / 1000));

export const ephemeralExpired = (openedAt: number, now = Date.now()) =>
  now >= openedAt + EPHEMERAL_LIFETIME_MS;
