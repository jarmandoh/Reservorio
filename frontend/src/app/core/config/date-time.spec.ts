import { describe, expect, it } from 'vitest';
import { formatCalendarDate, formatDateTime } from './date-time';

describe('date-time formatters', () => {
  it('keeps date-only reservation values on their calendar day', () => {
    expect(formatCalendarDate('2026-03-04')).toBe('4 de marzo de 2026');
  });

  it('uses a consistent 24-hour timestamp format', () => {
    expect(formatDateTime('2026-03-04T14:05:00-05:00')).toBe('4 de mar de 2026, 14:05');
  });

  it('returns an empty string for an empty value', () => {
    expect(formatCalendarDate(null)).toBe('');
    expect(formatDateTime('')).toBe('');
  });
});
