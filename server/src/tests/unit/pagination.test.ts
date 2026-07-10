import { describe, it, expect } from 'vitest';
import { parsePagination } from '../../lib/pagination';

describe('parsePagination', () => {
  it('should return defaults for empty query', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('should parse valid page and limit', () => {
    const result = parsePagination({ page: 2, limit: 10 });
    expect(result).toEqual({ page: 2, limit: 10, skip: 10 });
  });

  it('should parse string values', () => {
    const result = parsePagination({ page: '3' as any, limit: '15' as any });
    expect(result).toEqual({ page: 3, limit: 15, skip: 30 });
  });

  it('should enforce limit max of 100', () => {
    const result = parsePagination({ limit: 500 });
    expect(result.limit).toBe(100);
  });

  it('should handle zero and negative values', () => {
    const result = parsePagination({ page: 0, limit: -5 });
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('should handle NaN values', () => {
    const result = parsePagination({ page: 'abc' as any, limit: 'xyz' as any });
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('should compute skip correctly for various pages', () => {
    expect(parsePagination({ page: 1, limit: 20 }).skip).toBe(0);
    expect(parsePagination({ page: 2, limit: 20 }).skip).toBe(20);
    expect(parsePagination({ page: 5, limit: 10 }).skip).toBe(40);
  });
});
