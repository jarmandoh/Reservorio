'use strict';

const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    ok: false,
    message: 'Validación fallida',
    errors: errors.array().map((err) => `${err.param}: ${err.msg}`),
  });
}

module.exports = { handleValidation };
