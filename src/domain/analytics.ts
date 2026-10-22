/**
 * Logica de analisis del gemelo digital.
 *
 * Funciones puras (sin dependencias de Firestore ni de React) que calculan
 * fortalezas, brechas, progreso de objetivos e indicadores de resumen.
 * Son las mismas funciones que usan la interfaz y la generacion de PDF.
 */

import type { Competency, Goal, Level } from './types';

/** Umbral a partir del cual una competencia se considera fortaleza. */
export const STRENGTH_THRESHOLD = 4;

/** Umbral a partir del cual una competencia se considera area a mejorar. */
export const IMPROVABLE_THRESHOLD = 3;

/** Competencias con mayor nivel, ordenadas de mayor a menor. */
export const sortByLevelDesc = (competencies: Competency[]): Competency[] =>
  [...competencies].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

/** Competencias con menor nivel, ordenadas de menor a mayor. */
export const sortByLevelAsc = (competencies: Competency[]): Competency[] =>
  [...competencies].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

/** Fortalezas principales: nivel igual o superior al umbral. */
export const getStrengths = (competencies: Competency[]): Competency[] =>
  sortByLevelDesc(competencies.filter((c) => c.level >= STRENGTH_THRESHOLD));

/** Competencias a mejorar: nivel por debajo del umbral. */
export const getImprovementAreas = (competencies: Competency[]): Competency[] =>
  sortByLevelAsc(competencies.filter((c) => c.level < IMPROVABLE_THRESHOLD));

/** Nivel medio del perfil (0 cuando no hay competencias). */
export const averageLevel = (competencies: Competency[]): number => {
  if (competencies.length === 0) return 0;
  const total = competencies.reduce((acc, c) => acc + c.level, 0);
  return Math.round((total / competencies.length) * 10) / 10;
};

/** Competencias agrupadas por categoria, con su nivel medio. */
export interface CategorySummary {
  category: string;
  count: number;
  average: number;
}

export const getCategorySummary = (competencies: Competency[]): CategorySummary[] => {
  const map = new Map<string, { total: number; count: number }>();
  competencies.forEach((competency) => {
    const key = competency.category || 'Sin categoria';
    const current = map.get(key) ?? { total: 0, count: 0 };
    current.total += competency.level;
    current.count += 1;
    map.set(key, current);
  });
  return [...map.entries()]
    .map(([category, { total, count }]) => ({
      category,
      count,
      average: Math.round((total / count) * 10) / 10,
    }))
    .sort((a, b) => b.average - a.average || a.category.localeCompare(b.category));
};

/** Progreso de un objetivo en porcentaje (0-100). */
export const goalProgress = (goal: Goal): number => {
  if (goal.status === 'completed') return 100;
  const gap = goal.targetLevel - goal.currentLevel;
  if (gap <= 0) return 100;
  // Se combina el avance de nivel con el avance de las acciones del plan.
  const levelProgress = Math.min(1, Math.max(0, (goal.currentLevel - 1) / gap));
  const totalActions = goal.actions.length;
  const doneActions = goal.actions.filter((action) => action.done).length;
  const actionProgress = totalActions === 0 ? 0 : doneActions / totalActions;
  const ratio = (levelProgress + actionProgress) / 2;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
};

/** Progreso medio de todos los objetivos. */
export const overallGoalProgress = (goals: Goal[]): number => {
  if (goals.length === 0) return 0;
  const total = goals.reduce((acc, goal) => acc + goalProgress(goal), 0);
  return Math.round(total / goals.length);
};

/** Objetivos por estado. */
export interface GoalStatusSummary {
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
}

export const getGoalStatusSummary = (goals: Goal[]): GoalStatusSummary => ({
  pending: goals.filter((g) => g.status === 'pending').length,
  in_progress: goals.filter((g) => g.status === 'in_progress').length,
  completed: goals.filter((g) => g.status === 'completed').length,
  total: goals.length,
});

/**
 * Comparacion entre nivel actual y nivel objetivo por competencia.
 * Se usa en el grafico de barras comparativo y en el informe PDF.
 */
export interface LevelComparison {
  competencyId: string;
  name: string;
  category: string;
  current: Level;
  target: Level;
  gap: number;
}

/**
 * Construye la comparacion actual/objetivo.
 * Cuando la competencia no tiene un objetivo asociado se toma como objetivo
 * el siguiente nivel de la escala (nivel 5 si ya esta en el maximo).
 */
export const buildLevelComparison = (competencies: Competency[], goals: Goal[]): LevelComparison[] => {
  const goalByCompetency = new Map<string, Goal>();
  goals.forEach((goal) => {
    if (!goal.competencyId) return;
    const existing = goalByCompetency.get(goal.competencyId);
    if (!existing || goal.targetLevel > existing.targetLevel) {
      goalByCompetency.set(goal.competencyId, goal);
    }
  });

  return competencies.map((competency) => {
    const goal = goalByCompetency.get(competency.id);
    const target: Level = goal
      ? goal.targetLevel
      : competency.level >= 5
        ? 5
        : ((competency.level + 1) as Level);
    return {
      competencyId: competency.id,
      name: competency.name,
      category: competency.category,
      current: competency.level,
      target,
      gap: Math.max(0, target - competency.level),
    };
  });
};

/** Indicadores globales del panel principal. */
export interface TwinSummary {
  competencyCount: number;
  goalCount: number;
  completedGoalCount: number;
  averageLevel: number;
  overallProgress: number;
  strengthsCount: number;
  improvementCount: number;
}

export const buildTwinSummary = (competencies: Competency[], goals: Goal[]): TwinSummary => {
  const status = getGoalStatusSummary(goals);
  return {
    competencyCount: competencies.length,
    goalCount: goals.length,
    completedGoalCount: status.completed,
    averageLevel: averageLevel(competencies),
    overallProgress: overallGoalProgress(goals),
    strengthsCount: getStrengths(competencies).length,
    improvementCount: getImprovementAreas(competencies).length,
  };
};

/** Etiquetas de eje para el grafico radar (maximo 8 categorias). */
export const buildRadarData = (
  competencies: Competency[],
  limit = 8,
): { competency: string; nivel: number; maximo: number }[] =>
  sortByLevelDesc(competencies)
    .slice(0, limit)
    .map((competency) => ({
      competency: competency.name,
      nivel: competency.level,
      maximo: 5,
    }));
