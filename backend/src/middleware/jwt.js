'use strict';

const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'reservorio_dev_secret_change_me';

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET no configurado — usando secreto temporal inseguro.');
}

function sign(payload, expiresIn = '8h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
