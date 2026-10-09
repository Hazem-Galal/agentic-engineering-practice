// Services throw these; route handlers forward them to errorHandler with next(err)
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { httpError };
