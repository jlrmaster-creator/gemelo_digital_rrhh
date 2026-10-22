/**
 * Catalogo de acciones de desarrollo.
 *
 * Las recomendaciones son reglas sencillas y contenido predefinido: no se
 * utiliza ningun modelo de IA ni ninguna llamada a servicios externos. El
 * catalogo es totalmente configurable (editar este archivo) y las acciones
 * sugeridas se pueden modificar o descartar desde la interfaz antes de
 * guardarlas en un objetivo.
 */

import type { Level } from './types';

/** Categorias sugeridas para clasificar las competencias. */
export const COMPETENCY_CATEGORIES = [
  'Tecnica',
  'Comunicacion',
  'Liderazgo',
  'Organizacion',
  'Analisis',
  'Colaboracion',
  'Idiomas',
  'Gestion',
] as const;

export type CompetencyCategory = (typeof COMPETENCY_CATEGORIES)[number];

/** Plantilla de accion recomendada. */
export interface ActionTemplate {
  id: string;
  title: string;
  description: string;
  /**
   * Categorias de competencia a las que aplica la plantilla.
   * `'*'` significa que aplica a cualquier categoria.
   */
  categories: readonly string[] | '*';
  /** Nivel minimo (origen) para que la plantilla sea relevante. */
  fromLevel: Level;
  /** Nivel maximo (destino) para que la plantilla sea relevante. */
  toLevel: Level;
}

/**
 * Catalogo base. Las primeras entradas son transversales (aplican a cualquier
 * competencia) y despues se anaden las especificas por categoria.
 */
export const ACTION_CATALOG: readonly ActionTemplate[] = [
  {
    id: 'formacion-corta',
    title: 'Completar una formacion corta relacionada',
    description:
      'Realizar un curso o taller de entre 2 y 8 horas sobre la competencia objetivo, con certificado.',
    categories: '*',
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'lectura-especializada',
    title: 'Leer material especializado de la competencia',
    description:
      'Revisar dos fuentes de referencia (libros, articulos o documentacion oficial) y resumir las ideas clave.',
    categories: '*',
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'practica-guiada',
    title: 'Realizar practicas guiadas con acompanamiento',
    description:
      'Practicar la competencia en un caso real acompanada por una persona con experiencia, con foco en el objetivo marcado.',
    categories: '*',
    fromLevel: 1,
    toLevel: 3,
  },
  {
    id: 'proyecto-propio',
    title: 'Liderar un proyecto propio en el area',
    description:
      'Impulsar una iniciativa de principio a fin, con responsables, plazos y resultados medibles.',
    categories: '*',
    fromLevel: 3,
    toLevel: 5,
  },
  {
    id: 'mentoria',
    title: 'Recibir mentoria de una persona referente',
    description:
      'Acordar sesiones periodicas de mentoria para contrastar practicas y preparar el salto de nivel.',
    categories: '*',
    fromLevel: 3,
    toLevel: 5,
  },
  {
    id: 'presentacion',
    title: 'Participar en una presentacion publica',
    description:
      'Preparar y exponer una sesion de 20-30 minutos ante publico del equipo o de la organizacion.',
    categories: ['Comunicacion', 'Liderazgo'],
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'escritura',
    title: 'Practicar la comunicacion escrita',
    description:
      'Redactar documentos, informes o propuestas reales y pedir feedback sobre claridad y estructura.',
    categories: ['Comunicacion'],
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'feedback-360',
    title: 'Recoger feedback 360 de colleagues',
    description:
      'Solicitar opiniones de personas de distintos grupos de trabajo sobre el progreso en la competencia.',
    categories: ['Comunicacion', 'Liderazgo', 'Colaboracion'],
    fromLevel: 2,
    toLevel: 5,
  },
  {
    id: 'taller-comunicacion',
    title: 'Completar un taller de comunicacion',
    description:
      'Participar en un taller practico sobre comunicacion oral, escucha activa o negociacion.',
    categories: ['Comunicacion'],
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'formacion-tecnica',
    title: 'Profundizar en la parte tecnica de la competencia',
    description:
      'Realizar una formacion tecnica avanzada,Certified o con proyecto final, segun la competencia.',
    categories: ['Tecnica', 'Analisis'],
    fromLevel: 2,
    toLevel: 5,
  },
  {
    id: 'certificacion',
    title: 'Obtener una certificacion profesional',
    description:
      'Preparar y superar una certificacion reconocida en el ambito de la competencia objetivo.',
    categories: ['Tecnica', 'Idiomas'],
    fromLevel: 2,
    toLevel: 5,
  },
  {
    id: 'equipo-multidisciplinar',
    title: 'Trabajar en un equipo multidisciplinar',
    description:
      'Participar activamente en un equipo con perfiles de areas distintas, asumiendo responsabilidades propias.',
    categories: ['Colaboracion', 'Liderazgo'],
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'rotacion',
    title: 'Hacer una rotacion por otra area',
    description:
      'Rotar temporalmente a otra area o equipo para ampliar el contexto y aplicar la competencia en otro entorno.',
    categories: ['Tecnica', 'Gestion', 'Organizacion'],
    fromLevel: 2,
    toLevel: 5,
  },
  {
    id: 'planificacion',
    title: 'Aplicar una metodo de planificacion',
    description:
      'Aplicar un metodo de planificacion (OKR, Scrum, Kanban) a un area real y documentar el resultado.',
    categories: ['Organizacion', 'Gestion'],
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'analisis-datos',
    title: 'Analizar datos del area con criterio',
    description:
      'Preparar un analisis de datos propio del area, con conclusiones y recomendaciones accionables.',
    categories: ['Analisis'],
    fromLevel: 2,
    toLevel: 5,
  },
  {
    id: 'idioma-inmersivo',
    title: 'Practicar el idioma en contexto profesional',
    description:
      'Practicar conversaciones, presentaciones o redaccion en el idioma objetivo de forma habitual.',
    categories: ['Idiomas'],
    fromLevel: 1,
    toLevel: 5,
  },
  {
    id: 'equipo-directo',
    title: 'Coordinar un equipo o area con personas a cargo',
    description:
      'Responsabilizarse de la coordinacion de personas, objetivos y seguimiento del equipo.',
    categories: ['Liderazgo', 'Gestion'],
    fromLevel: 3,
    toLevel: 5,
  },
] as const;

/**
 * Devuelve las acciones sugeridas para una competencia y un nivel objetivo.
 *
 * Regla: se incluyen las plantillas cuya categoria coincide con la de la
 * competencia y cuyo rango de niveles cubre el salto previsto. Las plantillas
 * transversales (`'*'`) se priorizan y despues se limita el numero de
 * resultados para no saturar la interfaz.
 */
export const suggestActions = (
  competency: { category: string; level: Level },
  targetLevel: Level,
  limit = 4,
): ActionTemplate[] => {
  const fromLevel = competency.level;
  const toLevel = targetLevel;

  const matches = (template: ActionTemplate): boolean => {
    const categoryMatches =
      template.categories === '*' || template.categories.includes(competency.category);
    if (!categoryMatches) return false;
    // La plantilla es relevante si su rango solapa con el salto previsto.
    return template.fromLevel <= toLevel && template.toLevel >= fromLevel;
  };

  const generic = ACTION_CATALOG.filter((t) => t.categories === '*' && matches(t));
  const specific = ACTION_CATALOG.filter((t) => t.categories !== '*' && matches(t));

  return [...specific, ...generic].slice(0, limit);
};

/** Acciones por defecto cuando todavia no hay competencia relacionada. */
export const genericActions = (): ActionTemplate[] =>
  ACTION_CATALOG.filter((template) => template.categories === '*').slice(0, 3);
