/**
 * Configuración centralizada de monedas en frontend.
 * - DEFAULT_CURRENCY: COP por defecto
 * - SUPPORTED_CURRENCIES: extensible para agregar nuevas monedas
 * Para agregar una moneda: añade el código ISO 4217 aquí y en backend/src/config/currency.js
 * y en env SUPPORTED_CURRENCIES (ej. SUPPORTED_CURRENCIES=COP,USD,EUR,MXN)
 */

export const DEFAULT_CURRENCY = 'COP';

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'es-ES',
  MXN: 'es-MX',
  BRL: 'pt-BR',
  ARS: 'es-AR',
  CLP: 'es-CL',
  PEN: 'es-PE',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  COP: '$',
  USD: '$',
  EUR: '€',
  MXN: '$',
  BRL: 'R$',
  ARS: '$',
  CLP: '$',
  PEN: 'S/',
};

export function isValidCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code?.toUpperCase());
}

export function normalizeCurrency(code?: string | null): CurrencyCode {
  const upper = (code || DEFAULT_CURRENCY).toUpperCase() as CurrencyCode;
  return isValidCurrency(upper) ? upper : (DEFAULT_CURRENCY as CurrencyCode);
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale?: string
): string {
  const code = normalizeCurrency(currency);
  const loc = locale || CURRENCY_LOCALES[code] || 'es-CO';
  return new Intl.NumberFormat(loc, { style: 'currency', currency: code }).format(amount);
}
