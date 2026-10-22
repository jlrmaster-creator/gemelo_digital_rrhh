import { describe, expect, it } from 'vitest';
import {
  GOAL_STATUS_LABELS,
  LEVEL_BY_NUMBER,
  LEVEL_DEFINITIONS,
  levelDescription,
  levelLabel,
  normalizeLevel,
} from '@/domain/levels';
import { LEVELS } from '@/domain/types';

describe('escala de niveles', () => {
  it('define los cinco niveles con descripcion explicita', () => {
    expect(LEVEL_DEFINITIONS).toHaveLength(5);
    LEVEL_DEFINITIONS.forEach((definition) => {
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(20);
    });
  });

  it('expone la definicion de cada nivel numerico', () => {
    LEVELS.forEach((level) => {
      expect(LEVEL_BY_NUMBER[level]?.level).toBe(level);
      expect(levelLabel(level)).toBe(LEVEL_BY_NUMBER[level]?.short);
      expect(levelDescription(level)).toBe(LEVEL_BY_NUMBER[level]?.description);
    });
  });

  it('normaliza valores fuera de rango al minimo y al maximo', () => {
    expect(normalizeLevel(0)).toBe(1);
    expect(normalizeLevel(-10)).toBe(1);
    expect(normalizeLevel(9)).toBe(5);
    expect(normalizeLevel(99)).toBe(5);
  });

  it('normaliza valores no numericos a 1', () => {
    expect(normalizeLevel('abc')).toBe(1);
    expect(normalizeLevel(null)).toBe(1);
    expect(normalizeLevel(undefined)).toBe(1);
    expect(normalizeLevel(Number.NaN)).toBe(1);
  });

  it('redondea al nivel mas cercano', () => {
    expect(normalizeLevel(3.4)).toBe(3);
    expect(normalizeLevel(3.6)).toBe(4);
    expect(normalizeLevel('4')).toBe(4);
  });

  it('etiqueta los estados de objetivo', () => {
    expect(GOAL_STATUS_LABELS.pending).toBe('Pendiente');
    expect(GOAL_STATUS_LABELS.in_progress).toBe('En curso');
    expect(GOAL_STATUS_LABELS.completed).toBe('Completado');
  });
});
