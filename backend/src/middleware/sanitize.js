'use strict';

/**
 * Limpia un valor de entrada para prevenir XSS / injection.
 * Elimina caracteres HTML peligrosos y limita la longitud.
 * @param {*} val
 * @param {number} maxLen
 */
function clean(val, maxLen = 500) {
  return String(val ?? '')
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, maxLen);
}

/**
 * Valida que un número de teléfono tenga un formato aceptable.
 * Sólo dígitos, +, espacios y guiones. Entre 7 y 15 caracteres.
 */
function isValidPhone(phone) {
  return /^[0-9+\s\-]{7,15}$/.test(String(phone ?? ''));
}

/**
 * Middleware de validación para POST /reservations
 */
function validateReservation(req, res, next) {
  const { franja, cliente, telefono, servicio } = req.body ?? {};
  const errors = [];

  if (!franja || !clean(franja))   errors.push('franja es obligatorio');
  if (!cliente || !clean(cliente)) errors.push('cliente es obligatorio');
  if (!telefono)                   errors.push('telefono es obligatorio');
  else if (!isValidPhone(telefono)) errors.push('telefono inválido');

  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  // Sanitize sobre req.body para el siguiente handler
  req.body = {
    franja:   clean(franja),
    cliente:  clean(cliente),
    telefono: clean(telefono),
    servicio: clean(servicio ?? ''),
    notas:    clean(req.body?.notas ?? ''),
  };

  next();
}

/**
 * Middleware de validación para PUT /reservations/:rowIndex
 */
function validateUpdate(req, res, next) {
  const { disponibilidad } = req.body ?? {};
  const allowed = ['Disponible', 'Pendiente', 'Reservado', 'Confirmado'];
  const rowIndex = parseInt(req.params.rowIndex, 10);

  if (!rowIndex || rowIndex < 2 || rowIndex > 50000) {
    return res.status(400).json({ ok: false, errors: ['rowIndex inválido'] });
  }
  if (!allowed.includes(disponibilidad)) {
    return res.status(400).json({ ok: false, errors: ['disponibilidad inválido'] });
  }

  req.body = {
    rowIndex,
    disponibilidad,
    notas: clean(req.body?.notas ?? ''),
  };

  next();
}

module.exports = { clean, isValidPhone, validateReservation, validateUpdate };
