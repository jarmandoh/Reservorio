'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  const hex = process.env.GOOGLE_TOKENS_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('GOOGLE_TOKENS_KEY debe ser 32 bytes en hexadecimal (64 caracteres).');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Cifra un texto plano con AES-256-GCM.
 * Retorna: iv:tag:ciphertext (todo en hex).
 */
function encrypt(plaintext) {
  const key = getKey();
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Descifra un string producido por encrypt().
 */
function decrypt(encoded) {
  const key = getKey();
  const [ivHex, tagHex, ciphertext] = encoded.split(':');

  const iv  = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
