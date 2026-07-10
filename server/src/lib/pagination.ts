export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function parsePagination(query: PaginationQuery): { page: number; limit: number; skip: number } {
  const pageRaw = Number(query.page ?? 1);
  const limitRaw = Number(query.limit ?? 20);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 20;

  return { page, limit, skip: (page - 1) * limit };
}
