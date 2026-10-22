/**
 * Utilidades compartidas por los informes PDF.
 *
 * Los informes se generan completamente en el navegador con jsPDF: no se
 * envia ningun dato a ningun servicio externo y los documentos no se
 * comparten ni se envian por correo automaticamente.
 */

import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const COLORS = {
  brand: [5, 150, 105] as [number, number, number],
  brandSoft: [209, 250, 229] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
  slateLight: [241, 245, 249] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  rose: [225, 29, 72] as [number, number, number],
};

export const PAGE = {
  margin: 40,
  get width(): number {
    return 210;
  },
  get usable(): number {
    return 210 - 80;
  },
};

/** Formatea una fecha en formato largo en espanol. */
export const formatPdfDate = (value: Date | null | undefined): string => {
  if (!value || Number.isNaN(value.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value);
};

/** Dibuja la cabecera de pagina con el titulo del documento. */
export const drawHeader = (doc: jsPDF, title: string, subtitle: string): void => {
  doc.setFillColor(...COLORS.brand);
  doc.rect(0, 0, PAGE.width, 26, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, PAGE.margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, PAGE.margin, 21.5);

  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(8);
  doc.text(`Generado el ${formatPdfDate(new Date())}`, PAGE.width - PAGE.margin, 16, {
    align: 'right',
  });
};

/** Dibuja el pie de pagina con la numeracion. */
export const drawFooter = (doc: jsPDF): void => {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(PAGE.margin, 285, PAGE.width - PAGE.margin, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.slate);
    doc.text(
      'Gemelo Digital del Talento · Documento generado en el navegador · Pagina ' +
        page +
        ' de ' +
        pages,
      PAGE.margin,
      291,
    );
  }
};

/** Añade un titulo de seccion y devuelve la altura ocupada. */
export const drawSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text(title, PAGE.margin, y);
  doc.setDrawColor(...COLORS.brand);
  doc.setLineWidth(1);
  doc.line(PAGE.margin, y + 2.5, PAGE.margin + 22, y + 2.5);
  return y + 10;
};

/** Dibuja un bloque de texto con salto de linea automatico. */
export const drawParagraph = (doc: jsPDF, text: string, y: number, maxWidth = PAGE.usable): number => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slate);
  const lines = doc.splitTextToSize(text || '-', maxWidth) as string[];
  doc.text(lines, PAGE.margin, y);
  return y + lines.length * 4.5 + 4;
};

/**
 * Dibuja un grafico de barras horizontal muy sencillo (sin dependencias
 * adicionales) para representar los niveles por competencia.
 */
export const drawBarChart = (
  doc: jsPDF,
  items: { name: string; value: number; max?: number; color?: [number, number, number] }[],
  y: number,
): number => {
  const max = 5;
  const labelWidth = 58;
  const barWidth = 62;
  const rowHeight = 9;

  items.forEach((item, index) => {
    const rowY = y + index * rowHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    const label = doc.splitTextToSize(item.name, labelWidth)[0] as string;
    doc.text(label.length > 30 ? `${label.slice(0, 29)}…` : label, PAGE.margin, rowY + 4);

    const value = Math.max(0, Math.min(max, item.value));
    doc.setFillColor(...COLORS.slateLight);
    doc.rect(PAGE.margin + labelWidth, rowY, barWidth, 5, 'F');
    doc.setFillColor(...(item.color ?? COLORS.brand));
    doc.rect(PAGE.margin + labelWidth, rowY, (barWidth * value) / max, 5, 'F');

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.slate);
    doc.text(`${value}/${max}`, PAGE.margin + labelWidth + barWidth + 4, rowY + 4.5);
  });

  return y + items.length * rowHeight + 6;
};

/** Añade la tabla de datos al documento. */
export const addTable = (
  doc: jsPDF,
  head: string[],
  body: string[][],
  startY: number,
): number => {
  autoTable(doc, {
    head: [head],
    body,
    startY,
    margin: { left: PAGE.margin, right: PAGE.margin },
    styles: { fontSize: 8, cellPadding: 2, textColor: COLORS.text, lineColor: COLORS.border },
    headStyles: { fillColor: COLORS.brand, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.slateLight },
  });

  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
};
