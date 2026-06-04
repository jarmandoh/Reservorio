'use strict';

function notFound(_req, res) {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
}

function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err?.stack || err?.message || err);
  const status = err?.statusCode || err?.status || 500;
  const message = status === 500 ? 'Error interno del servidor' : err?.message || 'Error inesperado';
  const body = { ok: false, message };

  if (err?.errors) {
    body.errors = err.errors;
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
