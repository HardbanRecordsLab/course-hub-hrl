import { afterAll, beforeAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_JWT_SECRET = 'test-secret-key-for-vitest-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.CORS_ORIGIN = 'http://localhost:3000';
