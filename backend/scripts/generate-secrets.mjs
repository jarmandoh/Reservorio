#!/usr/bin/env node
/**
 * Genera los secretos para producción:
 *   - JWT_SECRET: aleatorio y fuerte (64 chars hex, 32 bytes).
 *   - ADMIN_PIN_HASH: hash bcrypt del ADMIN_PIN que escribas.
 *
 * Uso:
 *   node scripts/generate-secrets.mjs              # genera JWT_SECRET y pregunta el PIN
 *   node scripts/generate-secrets.mjs 123456       # usa el PIN indicado
 *
 * Copia la salida a tu backend/.env (o .env.production) y NO commitees los valores.
 */

import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

let pin = process.argv[2];

if (!pin) {
  const rl = readline.createInterface({ input, output });
  pin = (await rl.question('ADMIN_PIN (mínimo 6 caracteres, no "1234"): ')).trim();
  rl.close();
}

if (!pin || pin === '1234' || pin.length < 6) {
  console.error('ERROR: el PIN debe tener al menos 6 caracteres y no ser "1234".');
  process.exit(1);
}

console.log('--- Copia estos valores a backend/.env en producción (no los commitees) ---');
console.log(`JWT_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`ADMIN_PIN=${pin}`);
console.log(`ADMIN_PIN_HASH=${bcrypt.hashSync(pin, 10)}`);
console.log('--- ------------------------------------------------------------------ ---');
console.log('Recomendado: define ADMIN_PIN_HASH y deja ADMIN_PIN vacío en producción.');