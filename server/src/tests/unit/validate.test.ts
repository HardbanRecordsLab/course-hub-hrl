import { describe, it, expect } from 'vitest';
import { 
  registerSchema, 
  loginSchema, 
  createCourseSchema, 
  grantAccessSchema,
  checkoutSchema
} from '../../lib/validate';

describe('registerSchema', () => {
  it('should accept valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    expect(result.success).toBe(true);
  });

  it('should accept registration without name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'invalid-email',
      password: 'password123'
    });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: '123'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(result.success).toBe(true);
  });

  it('should invalidate missing password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com'
    });
    expect(result.success).toBe(false);
  });

  it('should invalidate missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password123'
    });
    expect(result.success).toBe(false);
  });
});

describe('createCourseSchema', () => {
  it('should accept valid course data', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test Course',
      description: 'Test description',
      externalUrl: 'https://example.com/course',
      priceCents: 10000,
      currency: 'PLN'
    });
    expect(result.success).toBe(true);
  });

  it('should accept minimal course data', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test Course',
      externalUrl: 'https://example.com/course'
    });
    expect(result.success).toBe(true);
  });

  it('should invalidate missing title', () => {
    const result = createCourseSchema.safeParse({
      externalUrl: 'https://example.com/course'
    });
    expect(result.success).toBe(false);
  });

  it('should invalidate non-URL externalUrl', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test Course',
      externalUrl: 'not-a-url'
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid status values', () => {
    const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
    validStatuses.forEach(status => {
      const result = createCourseSchema.safeParse({
        title: 'Test',
        externalUrl: 'https://example.com',
        status
      });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      externalUrl: 'https://example.com',
      status: 'INVALID'
    });
    expect(result.success).toBe(false);
  });
});

describe('grantAccessSchema', () => {
  it('should accept valid access grant', () => {
    const result = grantAccessSchema.safeParse({
      userId: 'user123',
      courseId: 'course456',
      expiresAt: '2025-12-31T23:59:59Z',
      source: 'admin'
    });
    expect(result.success).toBe(true);
  });

  it('should accept minimal access grant', () => {
    const result = grantAccessSchema.safeParse({
      userId: 'user123',
      courseId: 'course456'
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = grantAccessSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('checkoutSchema', () => {
  it('should accept valid checkout data', () => {
    const result = checkoutSchema.safeParse({
      courseId: 'course123'
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing courseId', () => {
    const result = checkoutSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
