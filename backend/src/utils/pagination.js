'use strict';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

function parsePagination(query = {}) {
  const rawPage = query.page;
  const rawPageSize = query.pageSize ?? query.limit;

  // La paginación solo se activa si el cliente la pide explícitamente; en caso
  // contrario la respuesta es completa (comportamiento histórico).
  const paginated = rawPage !== undefined || rawPageSize !== undefined;

  let page = 1;
  let pageSize = DEFAULT_PAGE_SIZE;

  if (paginated) {
    const parsedPage = Number.parseInt(String(rawPage ?? ''), 10);
    const parsedSize = Number.parseInt(String(rawPageSize ?? ''), 10);
    if (Number.isFinite(parsedSize) && parsedSize > 0) {
      pageSize = Math.min(parsedSize, MAX_PAGE_SIZE);
    }
    if (Number.isFinite(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    paginated,
  };
}

module.exports = { parsePagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };