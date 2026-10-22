import { describe, expect, it } from 'vitest';
import { buildPersonalReport } from '@/pdf/personalReport';
import { buildSharedReport } from '@/pdf/sharedReport';
import {
  fixtureCompetencies,
  fixtureGoals,
  fixtureHistory,
  fixtureProfile,
  fixtureTwin,
} from '@/test/fixtures';

describe('informe PDF personal', () => {
  it('genera un documento con el perfil, las competencias y los objetivos', () => {
    const doc = buildPersonalReport({
      twin: fixtureTwin(),
      profile: fixtureProfile(),
      competencies: fixtureCompetencies(),
      goals: fixtureGoals(),
      history: fixtureHistory(),
    });

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const output = doc.output();
    expect(output).toContain('Mi Gemelo Digital');
    expect(output).toContain('Ana Torres');
    expect(output).toContain('Comunicacion efectiva');
    expect(output).toContain('Mejorar el analisis de datos');
    expect(output).toContain('Nivel actualizado');
  });

  it('incluye el aviso de que no hay evaluacion automatica ni decisiones automatizadas', () => {
    const doc = buildPersonalReport({
      twin: fixtureTwin(),
      profile: fixtureProfile(),
      competencies: fixtureCompetencies(),
      goals: fixtureGoals(),
      history: fixtureHistory(),
    });
    expect(doc.output()).toContain('modelo de inteligencia artificial');
  });

  it('genera el informe sin datos y avisa de que no hay informacion', () => {
    const doc = buildPersonalReport({
      twin: null,
      profile: null,
      competencies: [],
      goals: [],
      history: [],
    });
    const output = doc.output();
    expect(output).toContain('Todavia no hay competencias registradas.');
    expect(output).toContain('Todavia no hay objetivos definidos.');
    expect(output).toContain('Todavia no hay eventos de evolucion registrados.');
  });
});

describe('informe PDF compartido', () => {
  it('incluye los objetivos y la evolucion cuando el alcance es completo', () => {
    const doc = buildSharedReport({
      twin: fixtureTwin(),
      ownerName: 'Ana Torres',
      ownerJobTitle: 'Tecnica de Recursos Humanos',
      competencies: fixtureCompetencies(),
      goals: fixtureGoals(),
      history: fixtureHistory(),
      scope: 'full',
      organizationName: 'Equipo de Seleccion',
    });

    const output = doc.output();
    expect(output).toContain('Perfil profesional compartido');
    expect(output).toContain('Equipo de Seleccion');
    expect(output).toContain('Objetivos profesionales');
    expect(output).toContain('Evolucion compartida');
  });

  it('omite objetivos y evolucion cuando el alcance es solo resumen', () => {
    const doc = buildSharedReport({
      twin: fixtureTwin(),
      ownerName: 'Ana Torres',
      ownerJobTitle: '',
      competencies: fixtureCompetencies(),
      goals: fixtureGoals(),
      history: fixtureHistory(),
      scope: 'summary',
      organizationName: 'Equipo de Seleccion',
    });

    const output = doc.output();
    expect(output).toContain('Resumen de competencias');
    expect(output).not.toContain('Objetivos profesionales');
    expect(output).not.toContain('Evolucion compartida');
    expect(output).toContain(
      'La persona ha compartido unicamente un resumen de sus competencias',
    );
  });

  it('aclara que el documento no contiene decisiones sobre contratacion ni despido', () => {
    const doc = buildSharedReport({
      twin: fixtureTwin(),
      ownerName: 'Ana Torres',
      ownerJobTitle: '',
      competencies: [],
      goals: [],
      history: [],
      scope: 'summary',
      organizationName: 'Equipo de Seleccion',
    });
    expect(doc.output()).toContain('contratacion, promocion o despido');
  });
});
