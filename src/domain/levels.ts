/**
 * Escala de niveles de competencia.
 *
 * La escala es cerrada (1-5) y cada nivel tiene una descripcion explicita
 * para que cualquier persona pueda entender que significa un nivel concreto
 * sin depender de una interpretacion subjetiva.
 */

import type { Level } from './types';

export interface LevelDefinition {
  level: Level;
  label: string;
  description: string;
  short: string;
}

/** Definicion completa de la escala. */
export const LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  {
    level: 1,
    label: 'Inicial',
    short: 'Inicial',
    description:
      'Conocimientos theoricos basicos o exposicion puntual. Necesita apoyo y supervision para completar tareas del area.',
  },
  {
    level: 2,
    label: 'Basico',
    short: 'Basico',
    description:
      'Realiza tareas habituales con poca autonomia. Aplica lo aprendido en situaciones conocidas y guiado.',
  },
  {
    level: 3,
    label: 'Autonomo',
    short: 'Autonomo',
    description:
      'Trabaja de forma autonoma en su ambito habitual. Resuelve problemas comunes y aporta criterio propio.',
  },
  {
    level: 4,
    label: 'Avanzado',
    short: 'Avanzado',
    description:
      'Domina el ambito, resuelve problemas no habituales y transmite buenas practicas a otras personas.',
  },
  {
    level: 5,
    label: 'Referente',
    short: 'Referente',
    description:
      'Marca la referencia en el area. Define Standards, mentorea a otras personas y lidera mejoras del equipo.',
  },
] as const;

/** Nivel a partir de su descripcion. */
export const LEVEL_BY_NUMBER: Record<Level, LevelDefinition> = LEVEL_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.level] = definition;
    return acc;
  },
  {} as Record<Level, LevelDefinition>,
);

/**
 * Normaliza cualquier entrada a un nivel valido.
 * Los valores fuera de rango se recortan al minimo o maximo permitido.
 */
export const normalizeLevel = (value: unknown): Level => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  const rounded = Math.round(numeric);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded as Level;
};

/** Etiqueta corta del nivel. */
export const levelLabel = (level: Level): string => LEVEL_BY_NUMBER[level]?.short ?? 'Inicial';

/** Descripcion completa del nivel. */
export const levelDescription = (level: Level): string =>
  LEVEL_BY_NUMBER[level]?.description ?? '';

/** Etiqueta textual de un objetivo segun su estado. */
export const GOAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completado',
};
