import { describe, it, expect, beforeEach } from 'vitest';
import { checkAccountLockout, recordFailedAttempt, clearFailedAttempts, getFailedAttemptCount, _resetForTests } from '../../lib/accountLockout';

describe('accountLockout', () => {
  beforeEach(() => {
    _resetForTests();
  });

  it('should not lock on first attempt', () => {
    const result = checkAccountLockout('user@example.com', '1.2.3.4');
    expect(result.locked).toBe(false);
  });

  it('should track failed attempts', () => {
    const email = 'user@example.com';
    const ip = '1.2.3.4';

    recordFailedAttempt(email, ip);
    expect(getFailedAttemptCount(email, ip)).toBe(1);

    recordFailedAttempt(email, ip);
    expect(getFailedAttemptCount(email, ip)).toBe(2);
  });

  it('should lock after 5 failed attempts', () => {
    const email = 'user@example.com';
    const ip = '1.2.3.4';

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(email, ip);
    }

    const result = checkAccountLockout(email, ip);
    expect(result.locked).toBe(true);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('should not lock if attempts are below threshold', () => {
    const email = 'user@example.com';
    const ip = '1.2.3.4';

    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(email, ip);
    }

    const result = checkAccountLockout(email, ip);
    expect(result.locked).toBe(false);
  });

  it('should clear lockout on successful login', () => {
    const email = 'user@example.com';
    const ip = '1.2.3.4';

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(email, ip);
    }

    clearFailedAttempts(email, ip);
    const result = checkAccountLockout(email, ip);
    expect(result.locked).toBe(false);
    expect(getFailedAttemptCount(email, ip)).toBe(0);
  });

  it('should track attempts independently per IP', () => {
    const email = 'user@example.com';

    for (let i = 0; i < 3; i++) {
      recordFailedAttempt(email, '1.1.1.1');
    }

    recordFailedAttempt(email, '2.2.2.2');

    expect(getFailedAttemptCount(email, '1.1.1.1')).toBe(3);
    expect(getFailedAttemptCount(email, '2.2.2.2')).toBe(1);
  });
});
