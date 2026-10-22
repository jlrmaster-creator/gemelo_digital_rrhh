/**
 * Acceso a `digitalTwins/{uid}/history`.
 *
 * El historial es append-only: se guardan eventos de evolucion relevantes y
 * nunca se sobrescribe el estado anterior del perfil. Esto permite comparar
 * el estado actual con las versiones anteriores.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { asLevel, asLongText, asText, toTimestamp } from './shared';
import type { HistoryEvent, HistoryEventType, Level } from '@/domain/types';

const HISTORY_SUBCOLLECTION = 'history';

const EVENT_TYPES: readonly HistoryEventType[] = [
  'competency_added',
  'level_updated',
  'training_completed',
  'goal_completed',
  'experience_added',
  'goal_created',
  'goal_updated',
  'note',
];

const toHistoryEvent = (id: string, data: Record<string, unknown> | undefined): HistoryEvent => {
  const rawType = asText(data?.type, 'note');
  const type = (EVENT_TYPES as readonly string[]).includes(rawType)
    ? (rawType as HistoryEventType)
    : 'note';
  const fromLevel = data?.fromLevel === null || data?.fromLevel === undefined
    ? null
    : (asLevel(data?.fromLevel, 1) as Level);
  const toLevel = data?.toLevel === null || data?.toLevel === undefined
    ? null
    : (asLevel(data?.toLevel, 1) as Level);
  return {
    id,
    type,
    title: asText(data?.title),
    description: asLongText(data?.description, 1000),
    competencyId: asText(data?.competencyId) || null,
    competencyName: asText(data?.competencyName),
    fromLevel,
    toLevel,
    createdAt: toTimestamp(data?.createdAt),
  };
};

/** Suscribe a la linea temporal de evolucion (mas reciente primero). */
export const subscribeHistory = (
  userId: string,
  onChange: (events: HistoryEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collection(db, 'digitalTwins', userId, HISTORY_SUBCOLLECTION);
  return onSnapshot(
    query(reference, orderBy('createdAt', 'desc'), limit(200)),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => toHistoryEvent(item.id, item.data() as Record<string, unknown>)));
    },
    (error) => onError?.(error),
  );
};

/** Lee el historial una sola vez. */
export const getHistory = async (userId: string): Promise<HistoryEvent[]> => {
  if (!db) return [];
  const snapshot = await getDocs(
    query(collection(db, 'digitalTwins', userId, HISTORY_SUBCOLLECTION), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs.map((item) => toHistoryEvent(item.id, item.data() as Record<string, unknown>));
};

export interface HistoryInput {
  type: HistoryEventType;
  title: string;
  description: string;
  competencyId: string | null;
  competencyName: string;
  fromLevel: Level | null;
  toLevel: Level | null;
}

/** Registra un evento de evolucion. */
export const addHistoryEvent = async (
  userId: string,
  input: HistoryInput,
  documentId: string,
): Promise<void> => {
  if (!db) return;
  await setDoc(doc(db, 'digitalTwins', userId, HISTORY_SUBCOLLECTION, documentId), {
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    competencyId: input.competencyId,
    competencyName: input.competencyName.trim(),
    fromLevel: input.fromLevel,
    toLevel: input.toLevel,
    createdAt: serverTimestamp(),
  });
};

/** Elimina un evento del historial. */
export const deleteHistoryEvent = async (userId: string, eventId: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, 'digitalTwins', userId, HISTORY_SUBCOLLECTION, eventId));
};
