export const EPHEMERAL_LIFETIME_MS = 60_000;

export const createEphemeralExpiry = (sentAt: number) => sentAt + EPHEMERAL_LIFETIME_MS;

export const ephemeralRemaining = (expiresAt: number, now = Date.now()) =>
  Math.max(0, Math.ceil((expiresAt - now) / 1000));

export const ephemeralExpired = (expiresAt: number, now = Date.now()) => now >= expiresAt;
