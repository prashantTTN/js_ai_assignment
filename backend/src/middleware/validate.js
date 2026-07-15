const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({
      error: first.msg,
      details: { fields: errors.array() },
    });
  }
  return next();
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal server error',
  };
  if (err.details) {
    payload.details = err.details;
  }
  if (statusCode === 500 && process.env.NODE_ENV !== 'development') {
    payload.error = 'Internal server error';
  }
  return res.status(statusCode).json(payload);
}

module.exports = { handleValidation, errorHandler };
