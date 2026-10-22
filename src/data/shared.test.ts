import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  asLevel,
  asLongText,
  asText,
  createId,
  formatDate,
  formatShortDate,
  toDate,
  toTimestamp,
} from '@/data/shared';

describe('utilidades de la capa de datos', () => {
  it('genera identificadores unicos', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createId()));
    expect(ids.size).toBe(50);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(5));
  });

  it('normaliza texto', () => {
    expect(asText('  hola  ')).toBe('hola');
    expect(asText(42)).toBe('42');
    expect(asText(true)).toBe('true');
    expect(asText(undefined)).toBe('');
    expect(asText(null, 'por defecto')).toBe('por defecto');
  });

  it('normaliza niveles al rango 1-5', () => {
    expect(asLevel(3)).toBe(3);
    expect(asLevel(0)).toBe(1);
    expect(asLevel(7)).toBe(5);
    expect(asLevel('abc', 2)).toBe(2);
  });

  it('recorta los textos largos', () => {
    const text = 'a'.repeat(30);
    expect(asLongText(text, 10)).toHaveLength(10);
    expect(asLongText(text, 100)).toHaveLength(30);
  });

  it('convierte marcas de tiempo', () => {
    const timestamp = Timestamp.fromDate(new Date('2026-01-02T00:00:00.000Z'));
    expect(toTimestamp(timestamp)).toBe(timestamp);
    expect(toTimestamp({ toDate: () => new Date('2026-01-02T00:00:00.000Z') })).toBeInstanceOf(
      Timestamp,
    );
    expect(toTimestamp(undefined)).toBeNull();
    expect(toTimestamp('no es una fecha')).toBeNull();
  });

  it('convierte marcas de tiempo a fecha', () => {
    const timestamp = Timestamp.fromDate(new Date('2026-01-02T00:00:00.000Z'));
    expect(toDate(timestamp)?.getUTCFullYear()).toBe(2026);
    expect(toDate(null)).toBeNull();
  });

  it('formatea fechas en espanol', () => {
    const timestamp = Timestamp.fromDate(new Date('2026-03-15T10:00:00.000Z'));
    expect(formatDate(timestamp)).toContain('2026');
    expect(formatShortDate(timestamp)).toMatch(/\d{2}\/\d{2}\/2026/);
    expect(formatDate(null)).toBe('Sin fecha');
    expect(formatShortDate(undefined)).toBe('—');
  });
});
