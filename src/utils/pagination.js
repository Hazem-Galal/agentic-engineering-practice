// Not used yet: reserved for the Should-have pagination metadata feature (docs/prd.md)
function buildPaginationMeta(total, page, pageSize) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

module.exports = { buildPaginationMeta };
