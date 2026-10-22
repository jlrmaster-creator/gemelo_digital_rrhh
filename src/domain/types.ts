/**
 * Tipos e interfaces del dominio.
 *
 * Todas las entidades del gemelo digital se definen aqui para que los
 * componentes, la capa de acceso a Firestore y la generacion de PDF compartan
 * exactamente el mismo contrato de datos.
 *
 * Convencion: los identificadores de documento son cadenas opacas generadas
 * por el cliente (`createId`). Las marcas de tiempo son `Timestamp` de
 * Firestore para poder ordenar y filtrar en el servidor.
 */

import type { Timestamp } from 'firebase/firestore';

/** Nivel de competencia. Escala cerrada de 1 a 5. */
export type Level = 1 | 2 | 3 | 4 | 5;

/** Niveles validos, util para validacion y para iterar en orden. */
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5] as const;

/** Estado de un objetivo profesional. */
export type GoalStatus = 'pending' | 'in_progress' | 'completed';

/** Estados validos de un objetivo. */
export const GOAL_STATUSES: readonly GoalStatus[] = ['pending', 'in_progress', 'completed'] as const;

/** Alcance de lo que una organizacion puede leer de un gemelo digital. */
export type SharingScope = 'full' | 'summary';

/** Alcances validos. */
export const SHARING_SCOPES: readonly SharingScope[] = ['full', 'summary'] as const;

/** Rol de un miembro dentro de una organizacion. */
export type OrganizationRole = 'hr' | 'admin';

/** Tipos de evento registrables en el historial de evolucion. */
export type HistoryEventType =
  | 'competency_added'
  | 'level_updated'
  | 'training_completed'
  | 'goal_completed'
  | 'experience_added'
  | 'goal_created'
  | 'goal_updated'
  | 'note';

/** Tipos de evento validos. */
export const HISTORY_EVENT_TYPES: readonly HistoryEventType[] = [
  'competency_added',
  'level_updated',
  'training_completed',
  'goal_completed',
  'experience_added',
  'goal_created',
  'goal_updated',
  'note',
] as const;

/** Etiquetas legibles para cada tipo de evento. */
export const HISTORY_EVENT_LABELS: Record<HistoryEventType, string> = {
  competency_added: 'Nueva competencia',
  level_updated: 'Actualizacion de nivel',
  training_completed: 'Formacion completada',
  goal_completed: 'Objetivo completado',
  experience_added: 'Experiencia incorporada',
  goal_created: 'Nuevo objetivo',
  goal_updated: 'Objetivo actualizado',
  note: 'Nota',
};

/** Perfil de cuenta de la persona usuaria. */
export interface UserProfile {
  uid: string;
  displayName: string;
  jobTitle: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Documento principal del gemelo digital. */
export interface DigitalTwin {
  userId: string;
  headline: string;
  summary: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Competencia del perfil profesional. */
export interface Competency {
  id: string;
  name: string;
  category: string;
  level: Level;
  description: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Accion concreta dentro de un plan de desarrollo. */
export interface GoalAction {
  id: string;
  title: string;
  done: boolean;
}

/** Objetivo profesional con su plan de desarrollo asociado. */
export interface Goal {
  id: string;
  title: string;
  description: string;
  /** Competencia relacionada. Puede quedar sin relacionar. */
  competencyId: string | null;
  /** Copia del nombre para poder mostrarlo aunque la competencia se elimine. */
  competencyName: string;
  currentLevel: Level;
  targetLevel: Level;
  /** Fecha prevista en formato `YYYY-MM-DD`. Vacio si no se indica. */
  targetDate: string;
  status: GoalStatus;
  actions: GoalAction[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Evento de evolucion del perfil. */
export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  title: string;
  description: string;
  competencyId: string | null;
  competencyName: string;
  fromLevel: Level | null;
  toLevel: Level | null;
  createdAt: Timestamp | null;
}

/** Permiso explicito de acceso a un gemelo digital. */
export interface SharingGrant {
  /** Identificador del miembro que recibe el permiso (id del documento). */
  memberUid: string;
  orgId: string;
  orgName: string;
  grantedAt: Timestamp | null;
  revokedAt: Timestamp | null;
  scope: SharingScope;
}

/** Organizacion (equipo de RR. HH.) con acceso a perfiles compartidos. */
export interface Organization {
  id: string;
  name: string;
  createdAt: Timestamp | null;
}

/** Miembro de una organizacion. */
export interface OrganizationMember {
  uid: string;
  role: OrganizationRole;
  email: string;
  addedAt: Timestamp | null;
}

/** Vista combinada que se entrega al personal de RR. HH. */
export interface SharedProfileSummary {
  twin: DigitalTwin;
  ownerName: string;
  ownerJobTitle: string;
  competencies: Competency[];
  goals: Goal[];
  scope: SharingScope;
}
