const failedAttempts = new Map<string, { count: number; lockedUntil: number | null; lastAttempt: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
const RESET_WINDOW_MS = 15 * 60 * 1000;

function getKey(identifier: string, ip: string): string {
  return `${identifier}:${ip}`;
}

export function checkAccountLockout(identifier: string, ip: string): { locked: boolean; retryAfterMs?: number } {
  const key = getKey(identifier, ip);
  const entry = failedAttempts.get(key);

  if (!entry) return { locked: false };

  if (entry.lockedUntil) {
    if (Date.now() < entry.lockedUntil) {
      return { locked: true, retryAfterMs: entry.lockedUntil - Date.now() };
    }
    failedAttempts.delete(key);
    return { locked: false };
  }

  if (Date.now() - entry.lastAttempt > RESET_WINDOW_MS) {
    failedAttempts.delete(key);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedAttempt(identifier: string, ip: string): void {
  const key = getKey(identifier, ip);
  const now = Date.now();
  const entry = failedAttempts.get(key);

  if (!entry) {
    failedAttempts.set(key, { count: 1, lockedUntil: null, lastAttempt: now });
    return;
  }

  if (now - entry.lastAttempt > RESET_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, lockedUntil: null, lastAttempt: now });
    return;
  }

  entry.count++;
  entry.lastAttempt = now;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
}

export function clearFailedAttempts(identifier: string, ip: string): void {
  const key = getKey(identifier, ip);
  failedAttempts.delete(key);
}

export function getFailedAttemptCount(identifier: string, ip: string): number {
  const key = getKey(identifier, ip);
  const entry = failedAttempts.get(key);
  return entry?.count ?? 0;
}

export function _resetForTests(): void {
  failedAttempts.clear();
}
