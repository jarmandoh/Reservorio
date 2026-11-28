/** Formatos de fecha y hora usados en toda la interfaz. */
export const DISPLAY_LOCALE = 'es-CO';

function toDisplayDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  // Las fechas de reserva no incluyen zona horaria. Construirlas localmente
  // evita que `new Date('YYYY-MM-DD')` las desplace al día anterior en América.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Fecha legible para citas: "3 de marzo de 2026". */
export function formatCalendarDate(value?: string | Date | null): string {
  const date = toDisplayDate(value);
  if (!date) return value ? String(value) : '';
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Marca de tiempo compacta y consistente para pagos, reseñas y actividad. */
export function formatDateTime(value?: string | Date | null): string {
  const date = toDisplayDate(value);
  if (!date) return value ? String(value) : '';
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
