'use strict';

/**
 * Handler de 429 compartido: además del mensaje, devuelve `retryAfter` en
 * segundos (y la cabecera `Retry-After`) para que el cliente pueda indicar
 * cuánto falta antes de reintentar.
 *
 * @param {string} message Mensaje para el usuario.
 * @returns {(req: import('express').Request, res: import('express').Response) => void}
 */
function tooManyRequests(message) {
  return (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const fromReset = resetTime instanceof Date ? Math.ceil((resetTime.getTime() - Date.now()) / 1000) : null;
    const fromHeader = Number(res.getHeader('Retry-After'));

    const retryAfter = Math.max(
      1,
      Number.isFinite(fromReset) && fromReset > 0
        ? fromReset
        : Number.isFinite(fromHeader) && fromHeader > 0
          ? fromHeader
          : 60
    );

    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ ok: false, message, retryAfter });
  };
}

module.exports = { tooManyRequests };
