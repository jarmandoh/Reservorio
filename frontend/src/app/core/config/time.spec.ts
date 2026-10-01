import { describe, it, expect } from 'vitest';
import { formatTime24 } from './time';

describe('formatTime24', () => {
  it('convierte horas con AM/PM a 24h', () => {
    expect(formatTime24('2:00 PM')).toBe('14:00');
    expect(formatTime24('2:30 pm')).toBe('14:30');
    expect(formatTime24('11:45 AM')).toBe('11:45');
  });

  it('respeta los casos límite de medianoche y mediodía', () => {
    expect(formatTime24('12:00 AM')).toBe('00:00');
    expect(formatTime24('12:30 PM')).toBe('12:30');
  });

  it('acepta 12h sin dos puntos y con punto abreviado', () => {
    expect(formatTime24('9 AM')).toBe('09:00');
    expect(formatTime24('2PM')).toBe('14:00');
    expect(formatTime24('10:30 p.m.')).toBe('22:30');
  });

  it('rellena con cero las horas de un dígito', () => {
    expect(formatTime24('9:00')).toBe('09:00');
    expect(formatTime24('14:00')).toBe('14:00');
  });

  it('convierte todas las horas de un rango', () => {
    expect(formatTime24('2:00 PM - 3:30 PM')).toBe('14:00 - 15:30');
    expect(formatTime24('9:00 AM a 12:00 PM')).toBe('09:00 a 12:00');
  });

  it('devuelve el texto tal cual cuando no hay horas', () => {
    expect(formatTime24('Tarde')).toBe('Tarde');
    expect(formatTime24('09:00 - 10:00 con Ana')).toBe('09:00 - 10:00 con Ana');
    expect(formatTime24('')).toBe('');
    expect(formatTime24(null)).toBe('');
  });

  it('no pisa valores que no son horas', () => {
    expect(formatTime24('99:99')).toBe('99:99');
  });
});
