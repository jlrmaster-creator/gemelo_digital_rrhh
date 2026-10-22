import { describe, expect, it } from 'vitest';
import {
  averageLevel,
  buildLevelComparison,
  buildRadarData,
  buildTwinSummary,
  getCategorySummary,
  getGoalStatusSummary,
  getImprovementAreas,
  getStrengths,
  goalProgress,
  overallGoalProgress,
  sortByLevelAsc,
  sortByLevelDesc,
} from '@/domain/analytics';
import { fixtureCompetencies, fixtureGoals } from '@/test/fixtures';
import type { Level } from '@/domain/types';

describe('analitica del gemelo digital', () => {
  it('ordena competencias por nivel sin mutar el original', () => {
    const competencies = fixtureCompetencies();
    const sorted = sortByLevelDesc(competencies);
    expect(sorted.map((c) => c.level)).toEqual([4, 3, 2]);
    expect(competencies.map((c) => c.level)).toEqual([4, 2, 3]);
    expect(sortByLevelAsc(competencies).map((c) => c.level)).toEqual([2, 3, 4]);
  });

  it('detecta fortalezas y areas a mejorar segun los umbrales', () => {
    const competencies = fixtureCompetencies();
    expect(getStrengths(competencies).map((c) => c.id)).toEqual(['c1']);
    expect(getImprovementAreas(competencies).map((c) => c.id)).toEqual(['c2']);
  });

  it('calcula el nivel medio y devuelve 0 sin competencias', () => {
    expect(averageLevel(fixtureCompetencies())).toBe(3);
    expect(averageLevel([])).toBe(0);
  });

  it('agrupa por categoria con su media', () => {
    const summary = getCategorySummary(fixtureCompetencies());
    expect(summary).toHaveLength(3);
    expect(summary.find((item) => item.category === 'Analisis')).toEqual({
      category: 'Analisis',
      count: 1,
      average: 2,
    });
  });

  it('agrupa las competencias de la misma categoria', () => {
    const base = fixtureCompetencies()[0]!;
    const competencies = [...fixtureCompetencies(), { ...base, id: 'c4', level: 2 as Level }];
    const comunicacion = getCategorySummary(competencies).find(
      (item) => item.category === 'Comunicacion',
    );
    expect(comunicacion).toEqual({ category: 'Comunicacion', count: 2, average: 3 });
  });

  it('calcula el progreso de un objetivo combinando nivel y acciones', () => {
    const goal = fixtureGoals()[0]!;
    // Salto de 2 a 4 (gap 2): nivel 2 => 0.5, acciones 1/2 => 0.5 => 50%.
    expect(goalProgress(goal)).toBe(50);
  });

  it('devuelve 100 cuando el objetivo esta completado', () => {
    const goal = fixtureGoals()[0]!;
    expect(goalProgress({ ...goal, status: 'completed' })).toBe(100);
  });

  it('devuelve 100 cuando ya se alcanzo el nivel objetivo', () => {
    const goal = fixtureGoals()[0]!;
    expect(goalProgress({ ...goal, currentLevel: goal.targetLevel })).toBe(100);
  });

  it('resume los estados de los objetivos', () => {
    expect(getGoalStatusSummary(fixtureGoals())).toEqual({
      pending: 1,
      in_progress: 1,
      completed: 0,
      total: 2,
    });
    expect(overallGoalProgress([])).toBe(0);
  });

  it('compara nivel actual y objetivo usando el objetivo mas exigente', () => {
    const comparison = buildLevelComparison(fixtureCompetencies(), fixtureGoals());
    const analisis = comparison.find((item) => item.competencyId === 'c2');
    // Hay dos objetivos para la misma competencia: se elige el de mayor nivel.
    expect(analisis?.target).toBe(4);
    expect(analisis?.gap).toBe(2);
  });

  it('usa el siguiente nivel cuando la competencia no tiene objetivo', () => {
    const comparison = buildLevelComparison(fixtureCompetencies(), []);
    const comunicacion = comparison.find((item) => item.competencyId === 'c1');
    expect(comunicacion?.target).toBe(5);
    const analisis = comparison.find((item) => item.competencyId === 'c2');
    expect(analisis?.target).toBe(3);
  });

  it('no propone crecer cuando la competencia ya esta en el maximo', () => {
    const comparison = buildLevelComparison(
      [{ ...fixtureCompetencies()[0]!, level: 5 }],
      [],
    );
    expect(comparison[0]?.target).toBe(5);
    expect(comparison[0]?.gap).toBe(0);
  });

  it('construye el resumen global del gemelo', () => {
    const summary = buildTwinSummary(fixtureCompetencies(), fixtureGoals());
    expect(summary.competencyCount).toBe(3);
    expect(summary.goalCount).toBe(2);
    expect(summary.completedGoalCount).toBe(0);
    expect(summary.averageLevel).toBe(3);
    expect(summary.strengthsCount).toBe(1);
    expect(summary.improvementCount).toBe(1);
  });

  it('limita los ejes del radar al numero solicitado', () => {
    const radar = buildRadarData(fixtureCompetencies(), 2);
    expect(radar).toHaveLength(2);
    expect(radar[0]?.nivel).toBe(4);
    expect(radar[0]?.maximo).toBe(5);
  });
});
