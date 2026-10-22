/**
 * Informe PDF personal: «Mi Gemelo Digital».
 *
 * Incluye resumen del perfil, competencias actuales, fortalezas, objetivos
 * profesionales, plan de desarrollo y evolucion registrada. Todo se genera en
 * el navegador a partir de los datos guardados en Firestore.
 */

import { jsPDF } from 'jspdf';
import { LEVEL_BY_NUMBER } from '@/domain/levels';
import {
  averageLevel,
  buildLevelComparison,
  getImprovementAreas,
  getStrengths,
  goalProgress,
} from '@/domain/analytics';
import type { Competency, DigitalTwin, Goal, HistoryEvent, UserProfile } from '@/domain/types';
import {
  COLORS,
  PAGE,
  addTable,
  drawBarChart,
  drawFooter,
  drawHeader,
  drawParagraph,
  drawSectionTitle,
  formatPdfDate,
} from './layout';

export interface PersonalReportInput {
  twin: DigitalTwin | null;
  profile: UserProfile | null;
  competencies: Competency[];
  goals: Goal[];
  history: HistoryEvent[];
  /** Nombre del archivo generado. */
  fileName?: string;
}

/** Genera el informe PDF personal y devuelve el documento. */
export const buildPersonalReport = (input: PersonalReportInput): jsPDF => {
  const { twin, profile, competencies, goals, history } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const ownerName = profile?.displayName || twin?.headline || 'Persona usuaria';
  const jobTitle = profile?.jobTitle || '';

  drawHeader(
    doc,
    'Mi Gemelo Digital',
    'Informe personal de perfil profesional, objetivos y evolucion',
  );

  let y = 38;

  // 1. Resumen del perfil
  y = drawSectionTitle(doc, '1. Resumen del perfil', y);
  y = drawParagraph(doc, `Nombre: ${ownerName}`, y);
  if (jobTitle) y = drawParagraph(doc, `Puesto: ${jobTitle}`, y);
  if (twin?.headline) y = drawParagraph(doc, `Titular: ${twin.headline}`, y);
  y = drawParagraph(
    doc,
    `Competencias registradas: ${competencies.length} · Objetivos: ${goals.length} · Nivel medio: ${averageLevel(
      competencies,
    ).toFixed(1)} de 5`,
    y,
  );
  if (twin?.summary) y = drawParagraph(doc, twin.summary, y);
  y += 2;

  // 2. Competencias actuales
  y = drawSectionTitle(doc, '2. Competencias actuales', y);
  if (competencies.length === 0) {
    y = drawParagraph(doc, 'Todavia no hay competencias registradas.', y);
  } else {
    y = drawBarChart(
      doc,
      competencies.map((competency) => ({
        name: competency.name,
        value: competency.level,
      })),
      y,
    );
  }

  // 3. Fortalezas
  const strengths = getStrengths(competencies);
  y = drawSectionTitle(doc, '3. Fortalezas principales', y);
  if (strengths.length === 0) {
    y = drawParagraph(doc, 'No hay competencias en nivel Avanzado o Referente todavia.', y);
  } else {
    y = addTable(
      doc,
      ['Competencia', 'Categoria', 'Nivel'],
      strengths.map((competency) => [
        competency.name,
        competency.category,
        `${competency.level} - ${LEVEL_BY_NUMBER[competency.level]?.short ?? ''}`,
      ]),
      y,
    );
    y += 4;
  }

  // 4. Competencias a mejorar
  const improvement = getImprovementAreas(competencies);
  y = drawSectionTitle(doc, '4. Competencias a mejorar', y);
  if (improvement.length === 0) {
    y = drawParagraph(doc, 'Todas las competencias registradas estan en nivel Autonomo o superior.', y);
  } else {
    y = addTable(
      doc,
      ['Competencia', 'Categoria', 'Nivel actual', 'Nivel objetivo'],
      buildLevelComparison(competencies, goals)
        .filter((comparison) => improvement.some((item) => item.id === comparison.competencyId))
        .map((comparison) => [
          comparison.name,
          comparison.category,
          `${comparison.current} - ${LEVEL_BY_NUMBER[comparison.current]?.short ?? ''}`,
          `${comparison.target} - ${LEVEL_BY_NUMBER[comparison.target]?.short ?? ''}`,
        ]),
      y,
    );
    y += 4;
  }

  // 5. Objetivos profesionales
  y = drawSectionTitle(doc, '5. Objetivos profesionales', y);
  if (goals.length === 0) {
    y = drawParagraph(doc, 'Todavia no hay objetivos definidos.', y);
  } else {
    y = addTable(
      doc,
      ['Objetivo', 'Competencia', 'Actual', 'Objetivo', 'Estado', 'Progreso'],
      goals.map((goal) => [
        goal.title,
        goal.competencyName || '-',
        String(goal.currentLevel),
        String(goal.targetLevel),
        goal.status === 'completed'
          ? 'Completado'
          : goal.status === 'in_progress'
            ? 'En curso'
            : 'Pendiente',
        `${goalProgress(goal)}%`,
      ]),
      y,
    );
    y += 4;
  }

  // 6. Plan de desarrollo
  y = drawSectionTitle(doc, '6. Plan de desarrollo', y);
  const actions = goals.flatMap((goal) =>
    goal.actions.map((action) => ({
      goal: goal.title,
      title: action.title,
      done: action.done,
    })),
  );
  if (actions.length === 0) {
    y = drawParagraph(doc, 'No hay acciones de desarrollo registradas.', y);
  } else {
    y = addTable(
      doc,
      ['Objetivo', 'Accion', 'Estado'],
      actions.map((action) => [
        action.goal,
        action.title,
        action.done ? 'Realizada' : 'Pendiente',
      ]),
      y,
    );
    y += 4;
  }

  // 7. Evolucion registrada
  y = drawSectionTitle(doc, '7. Evolucion registrada', y);
  if (history.length === 0) {
    y = drawParagraph(doc, 'Todavia no hay eventos de evolucion registrados.', y);
  } else {
    const rows = history.slice(0, 40).map((event) => {
      const date = event.createdAt ? event.createdAt.toDate() : null;
      return [
        date ? formatPdfDate(date) : 'Sin fecha',
        event.title,
        event.competencyName || '-',
        event.fromLevel && event.toLevel
          ? `${event.fromLevel} -> ${event.toLevel}`
          : event.toLevel
            ? `Nivel ${event.toLevel}`
            : '-',
      ];
    });
    y = addTable(doc, ['Fecha', 'Evento', 'Competencia', 'Cambio'], rows, y);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate);
  const note =
    'Este documento refleja los datos declarados por la persona y no incluye evaluacion automatica ' +
    'ni decisiones sobre contratacion, promocion o rendimiento. Las recomendaciones son reglas ' +
    'simples predefinidas y no proceden de un modelo de inteligencia artificial.';
  doc.text(doc.splitTextToSize(note, PAGE.usable) as string[], PAGE.margin, Math.min(y + 6, 278));

  drawFooter(doc);
  return doc;
};

/** Genera el informe PDF personal y dispara la descarga en el navegador. */
export const downloadPersonalReport = (input: PersonalReportInput): string => {
  const doc = buildPersonalReport(input);
  const fileName =
    input.fileName ?? `mi-gemelo-digital-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
};
