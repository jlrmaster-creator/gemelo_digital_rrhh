import { describe, expect, it } from 'vitest';
import {
  ACTION_CATALOG,
  COMPETENCY_CATEGORIES,
  genericActions,
  suggestActions,
} from '@/domain/actionCatalog';

describe('catalogo de acciones de desarrollo', () => {
  it('no contiene identificadores duplicados', () => {
    const ids = ACTION_CATALOG.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ofrece un catalogo estatico y editable (no generado por IA)', () => {
    // El catalogo es configuracion local: comprobar que no depende de red.
    expect(ACTION_CATALOG.length).toBeGreaterThan(5);
    ACTION_CATALOG.forEach((template) => {
      expect(template.title.length).toBeGreaterThan(5);
      expect(template.description.length).toBeGreaterThan(20);
      expect(template.fromLevel).toBeGreaterThanOrEqual(1);
      expect(template.toLevel).toBeLessThanOrEqual(5);
      expect(template.fromLevel).toBeLessThanOrEqual(template.toLevel);
    });
  });

  it('sugiere acciones transversales para cualquier categoria', () => {
    const suggestions = suggestActions({ category: 'Tecnica', level: 1 }, 2);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(4);
    suggestions.forEach((template) => {
      expect(
        template.categories === '*' || template.categories.includes('Tecnica'),
      ).toBe(true);
    });
  });

  it('prioriza las acciones especificas de la categoria', () => {
    const suggestions = suggestActions({ category: 'Analisis', level: 2 }, 4);
    expect(suggestions[0]?.categories).not.toBe('*');
    expect(suggestions[0]?.categories).toContain('Analisis');
  });

  it('filtra por el rango de niveles del salto previsto', () => {
    const sugerencias = suggestActions({ category: 'Gestion', level: 4 }, 5);
    sugerencias.forEach((template) => {
      expect(template.fromLevel).toBeLessThanOrEqual(5);
      expect(template.toLevel).toBeGreaterThanOrEqual(4);
    });
  });

  it('limita el numero de sugerencias', () => {
    const suggestions = suggestActions({ category: 'Liderazgo', level: 1 }, 5, 2);
    expect(suggestions).toHaveLength(2);
  });

  it('ofrece acciones por defecto cuando no hay competencia relacionada', () => {
    const defaults = genericActions();
    expect(defaults).toHaveLength(3);
    defaults.forEach((template) => expect(template.categories).toBe('*'));
  });

  it('expone las categorias sugeridas', () => {
    expect(COMPETENCY_CATEGORIES).toContain('Comunicacion');
    expect(COMPETENCY_CATEGORIES).toContain('Liderazgo');
  });
});
