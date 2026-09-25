'use strict';

/**
 * Configuración centralizada de monedas.
 * - DEFAULT_CURRENCY: moneda por defecto (COP)
 * - SUPPORTED_CURRENCIES: lista extensible vía env SUPPORTED_CURRENCIES
 * Permite agregar nuevas monedas sin tocar código: solo env.
 */

const DEFAULT_CURRENCY = String(process.env.DEFAULT_CURRENCY || 'COP')
  .trim()
  .toUpperCase();

const SUPPORTED_CURRENCIES = String(
  process.env.SUPPORTED_CURRENCIES || 'COP,USD,EUR,MXN,BRL,ARS,CLP,PEN'
)
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

// Asegurar que el default siempre esté soportado
if (!SUPPORTED_CURRENCIES.includes(DEFAULT_CURRENCY)) {
  SUPPORTED_CURRENCIES.unshift(DEFAULT_CURRENCY);
}

const CURRENCY_LOCALES = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'es-ES',
  MXN: 'es-MX',
  BRL: 'pt-BR',
  ARS: 'es-AR',
  CLP: 'es-CL',
  PEN: 'es-PE',
};

const CURRENCY_SYMBOLS = {
  COP: '$',
  USD: '$',
  EUR: '€',
  MXN: '$',
  BRL: 'R$',
  ARS: '$',
  CLP: '$',
  PEN: 'S/',
};

function isValidCurrency(code) {
  if (!code) return false;
  return SUPPORTED_CURRENCIES.includes(String(code).trim().toUpperCase());
}

function normalizeCurrency(code) {
  const upper = String(code || DEFAULT_CURRENCY)
    .trim()
    .toUpperCase();
  return isValidCurrency(upper) ? upper : DEFAULT_CURRENCY;
}

function getLocaleForCurrency(code) {
  const upper = normalizeCurrency(code);
  return CURRENCY_LOCALES[upper] || 'es-CO';
}

function getSymbolForCurrency(code) {
  const upper = normalizeCurrency(code);
  return CURRENCY_SYMBOLS[upper] || upper;
}

module.exports = {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  CURRENCY_LOCALES,
  CURRENCY_SYMBOLS,
  isValidCurrency,
  normalizeCurrency,
  getLocaleForCurrency,
  getSymbolForCurrency,
};
