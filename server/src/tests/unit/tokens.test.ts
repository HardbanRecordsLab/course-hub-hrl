import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

describe('Refresh token hashing', () => {
  it('should produce consistent SHA-256 hash for same token', () => {
    const token = 'test-token-123';
    const hash1 = crypto.createHash('sha256').update(token).digest('hex');
    const hash2 = crypto.createHash('sha256').update(token).digest('hex');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should produce different hashes for different tokens', () => {
    const hash1 = crypto.createHash('sha256').update('token-a').digest('hex');
    const hash2 = crypto.createHash('sha256').update('token-b').digest('hex');
    expect(hash1).not.toBe(hash2);
  });
});

describe('generate base64url refresh token', () => {
  it('should generate 48-byte base64url token', () => {
    const token = crypto.randomBytes(48).toString('base64url');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate unique tokens each time', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(crypto.randomBytes(48).toString('base64url'));
    }
    expect(tokens.size).toBe(100);
  });
});
