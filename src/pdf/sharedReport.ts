/**
 * Informe PDF profesional compartido.
 *
 * Solo incluye los datos que la persona ha autorizado compartir con la
 * organizacion y, ademas, respeta el alcance elegido al compartir:
 *
 * - `summary`: perfil basico y competencias con su nivel.
 * - `full`: resumen, competencias, fortalezas, objetivos, plan de desarrollo
 *   y evolucion registrada.
 *
 * El informe se genera en el navegador de la persona de RR. HH. que lo
 * solicita. Nunca se envia por correo ni se publica de forma automatica.
 */

import { jsPDF } from 'jspdf';
import { LEVEL_BY_NUMBER } from '@/domain/levels';
import {
  averageLevel,
  getImprovementAreas,
  getStrengths,
  goalProgress,
} from '@/domain/analytics';
import type { Competency, DigitalTwin, Goal, HistoryEvent, SharingScope } from '@/domain/types';
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

export interface SharedReportInput {
  twin: DigitalTwin | null;
  ownerName: string;
  ownerJobTitle: string;
  competencies: Competency[];
  goals: Goal[];
  history: HistoryEvent[];
  scope: SharingScope;
  organizationName: string;
  fileName?: string;
}

/** Genera el informe PDF compartido y devuelve el documento. */
export const buildSharedReport = (input: SharedReportInput): jsPDF => {
  const { twin, ownerName, ownerJobTitle, competencies, goals, history, scope } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  drawHeader(
    doc,
    'Perfil profesional compartido',
    `Compartido por ${ownerName} con ${input.organizationName}`,
  );

  let y = 38;

  // 1. Identificacion
  y = drawSectionTitle(doc, '1. DatosBasicos', y);
  y = drawParagraph(doc, `Nombre: ${ownerName}`, y);
  if (ownerJobTitle) y = drawParagraph(doc, `Puesto: ${ownerJobTitle}`, y);
  if (twin?.headline) y = drawParagraph(doc, `Titular: ${twin.headline}`, y);
  y = drawParagraph(
    doc,
    `Alcance de los datos compartidos: ${
      scope === 'full' ? 'Perfil completo autorizado' : 'Resumen de competencias'
    }`,
    y,
  );
  y += 2;

  // 2. Competencias
  y = drawSectionTitle(doc, '2. Competencias', y);
  if (competencies.length === 0) {
    y = drawParagraph(doc, 'No hay competencias compartidas.', y);
  } else {
    y = drawBarChart(
      doc,
      competencies.map((competency) => ({
        name: competency.name,
        value: competency.level,
      })),
      y,
    );
    y = drawParagraph(
      doc,
      `Nivel medio declarado: ${averageLevel(competencies).toFixed(1)} de 5 sobre ${competencies.length} competencias.`,
      y,
    );
  }

  // 3. Fortalezas (solo en alcance completo)
  if (scope === 'full') {
    const strengths = getStrengths(competencies);
    y = drawSectionTitle(doc, '3. Fortalezas declaradas', y);
    if (strengths.length === 0) {
      y = drawParagraph(doc, 'No hay competencias en nivel Avanzado o Referente.', y);
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

    // 4. Areas a mejorar
    const improvement = getImprovementAreas(competencies);
    y = drawSectionTitle(doc, '4. Competencias a mejorar', y);
    if (improvement.length === 0) {
      y = drawParagraph(doc, 'Todas las competencias estan en nivel Autonomo o superior.', y);
    } else {
      y = addTable(
        doc,
        ['Competencia', 'Categoria', 'Nivel actual'],
        improvement.map((competency) => [
          competency.name,
          competency.category,
          `${competency.level} - ${LEVEL_BY_NUMBER[competency.level]?.short ?? ''}`,
        ]),
        y,
      );
      y += 4;
    }

    // 5. Objetivos
    y = drawSectionTitle(doc, '5. Objetivos profesionales', y);
    if (goals.length === 0) {
      y = drawParagraph(doc, 'No hay objetivos compartidos.', y);
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
      y = drawParagraph(doc, 'No hay acciones de desarrollo compartidas.', y);
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

    // 7. Evolucion
    y = drawSectionTitle(doc, '7. Evolucion compartida', y);
    if (history.length === 0) {
      y = drawParagraph(doc, 'No hay eventos de evolucion compartidos.', y);
    } else {
      y = addTable(
        doc,
        ['Fecha', 'Evento', 'Competencia'],
        history.slice(0, 40).map((event) => [
          event.createdAt ? formatPdfDate(event.createdAt.toDate()) : 'Sin fecha',
          event.title,
          event.competencyName || '-',
        ]),
        y,
      );
    }
  } else {
    y = drawSectionTitle(doc, '3. Alcance de los datos', y);
    y = drawParagraph(
      doc,
      'La persona ha compartido unicamente un resumen de sus competencias. Los objetivos ' +
        'profesionales, el plan de desarrollo y la evolucion no forman parte de los datos ' +
        'autorizados.',
      y,
    );
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.slate);
  const note =
    'Documento generado a partir de los datos que la persona ha autorizado compartir. No contiene ' +
    'evaluacion automatica del rendimiento ni decisiones sobre contratacion, promocion o despido. ' +
    'Uso interno de Recursos Humanos.';
  doc.text(doc.splitTextToSize(note, PAGE.usable) as string[], PAGE.margin, Math.min(y + 6, 278));

  drawFooter(doc);
  return doc;
};

/** Genera el informe PDF compartido y dispara la descarga en el navegador. */
export const downloadSharedReport = (input: SharedReportInput): string => {
  const doc = buildSharedReport(input);
  const slug = (input.ownerName || 'perfil')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = input.fileName ?? `perfil-compartido-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
};
