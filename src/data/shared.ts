/**
 * Utilidades comunes de la capa de datos.
 *
 * - Identificadores estables generados en el cliente.
 * - Conversion entre los documentos de Firestore y los tipos del dominio.
 * - Manejo de `Timestamp` (puede venir ausente en documentos parciales).
 */

import { Timestamp } from 'firebase/firestore';
import type { Level } from '@/domain/types';

/**
 * Genera un identificador de documento estable y legible.
 * Usa `crypto.randomUUID` cuando esta disponible y recurre a un contador
 * pseudoaleatorio en navegadores sin soporte.
 */
export const createId = (): string => {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
};

/** Devuelve el `Timestamp` actual o `null` si no se puede crear. */
export const now = (): Timestamp => Timestamp.now();

/** Normaliza un valor desconocido a `Timestamp | null`. */
export const toTimestamp = (value: unknown): Timestamp | null => {
  if (value instanceof Timestamp) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    const candidate = value as { toDate: () => Date };
    const date = candidate.toDate();
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return null;
};

/** Convierte un `Timestamp` a `Date` (null si no existe). */
export const toDate = (value: Timestamp | null): Date | null =>
  value && typeof value.toDate === 'function' ? value.toDate() : null;

/** Formatea una fecha en formato largo en español. */
export const formatDate = (value: Timestamp | null | Date | undefined): string => {
  const date = value instanceof Date ? value : toDate(value ?? null);
  if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/** Formatea una fecha corta `dd/mm/aaaa`. */
export const formatShortDate = (value: Timestamp | null | Date | undefined): string => {
  const date = value instanceof Date ? value : toDate(value ?? null);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/** Convierte un valor desconocido en texto limpio (sin espacios sobrantes). */
export const asText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

/** Convierte un valor desconocido en un nivel valido de la escala. */
export const asLevel = (value: unknown, fallback: Level = 1): Level => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.round(numeric);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded as Level;
};

/** Convierte un valor desconocido en texto largo recortado. */
export const asLongText = (value: unknown, maxLength = 2000): string => {
  const text = asText(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};
