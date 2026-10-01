/**
 * Formato de hora centralizado en frontend.
 *
 * La columna `franja` / `slot` llega como texto libre desde la hoja de Google
 * (syncService) y puede venir en 12h ("2:00 PM", "9 AM") o en 24h ("14:00",
 * "9:00"). Para que el usuario vea siempre el mismo formato, en la UI de
 * cliente se normaliza a 24h con dos dígitos.
 *
 * Las pantallas administrativas siguen mostrando el valor tal cual llega, porque
 * ahí se necesita comparar contra lo que hay escrito en la hoja.
 */

/** "2:00 PM", "2PM", "9 am", "10:30 p.m." */
const TWELVE_HOUR = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/gi;

/** "14:00" o "9:05" preceded by anything that is not part of another time. */
const TWENTY_FOUR_HOUR = /(^|[^\d:])(\d{1,2}):(\d{2})(?!\d)/g;

/** "9" a secas en un rango tipo "9 a 11" no se toca: solo hace falta 12h→24h. */
function convertTwelveHour(match: string, hour: string, minute: string | undefined, meridiem: string): string {
  const parsed = Number(hour);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) return match;

  const isPm = meridiem.toLowerCase() === 'p';
  let hours = parsed;
  if (isPm && hours !== 12) hours += 12;
  if (!isPm && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${(minute ?? '00').padStart(2, '0')}`;
}

function padTwentyFourHour(match: string, prefix: string, hour: string, minute: string): string {
  const parsed = Number(hour);
  if (!Number.isInteger(parsed) || parsed > 23) return match;
  return `${prefix}${String(parsed).padStart(2, '0')}:${minute}`;
}

/**
 * Convierte una franja a formato 24h ("14:00").
 * Devuelve el texto original si no encuentra horas recognizable, para no romper
 * rangos escritos a mano como "Tarde" o "09:00 - 10:00 con Ana".
 */
export function formatTime24(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';

  return raw
    .replace(TWELVE_HOUR, convertTwelveHour)
    .replace(TWENTY_FOUR_HOUR, padTwentyFourHour)
    .replace(/\s{2,}/g, ' ')
    .trim();
}
