// TODO: replace with real JWT validation
const { httpError } = require('../utils/http-error');

function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === (process.env.API_KEY || 'dev-key')) {
    return next();
  }
  next(httpError(401, 'Unauthorized'));
}

module.exports = { authenticate };
