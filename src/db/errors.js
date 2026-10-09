// better-sqlite3 reports constraint violations only through the message text
function isUniqueViolation(err) {
  return Boolean(err.message && err.message.includes('UNIQUE'));
}

module.exports = { isUniqueViolation };
