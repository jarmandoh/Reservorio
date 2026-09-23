'use strict';

const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'reservorio_dev_secret_change_me';

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET no configurado — usando secreto temporal inseguro.');
}

function sign(payload, expiresIn = '8h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verify(token, options = {}) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'], ...options });
}

module.exports = { sign, verify };
