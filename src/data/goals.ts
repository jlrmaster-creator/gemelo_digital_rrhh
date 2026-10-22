/**
 * Acceso a `digitalTwins/{uid}/goals`.
 *
 * Cada objetivo guarda su nivel actual, su nivel objetivo, el estado y las
 * acciones del plan de desarrollo. Las acciones provienen del catalogo
 * configurable de la aplicacion (nunca de un modelo de IA).
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { asLevel, asLongText, asText, toTimestamp } from './shared';
import type { Goal, GoalAction, GoalStatus, Level } from '@/domain/types';

const GOALS_SUBCOLLECTION = 'goals';

const toGoalAction = (value: unknown): GoalAction => {
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    return {
      id: asText(raw.id) || String(Date.now()),
      title: asText(raw.title),
      done: Boolean(raw.done),
    };
  }
  return { id: '', title: asText(value), done: false };
};

const toGoal = (id: string, data: Record<string, unknown> | undefined): Goal => {
  const status = asText(data?.status, 'pending');
  const safeStatus: GoalStatus =
    status === 'in_progress' || status === 'completed' ? status : 'pending';
  const actions = Array.isArray(data?.actions)
    ? (data.actions as unknown[]).map(toGoalAction).filter((action) => action.title.length > 0)
    : [];
  return {
    id,
    title: asText(data?.title),
    description: asLongText(data?.description, 1000),
    competencyId: asText(data?.competencyId) || null,
    competencyName: asText(data?.competencyName),
    currentLevel: asLevel(data?.currentLevel, 1) as Level,
    targetLevel: asLevel(data?.targetLevel, 2) as Level,
    targetDate: asText(data?.targetDate),
    status: safeStatus,
    actions,
    createdAt: toTimestamp(data?.createdAt),
    updatedAt: toTimestamp(data?.updatedAt),
  };
};

/** Suscribe a la lista de objetivos de un gemelo digital. */
export const subscribeGoals = (
  userId: string,
  onChange: (goals: Goal[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collection(db, 'digitalTwins', userId, GOALS_SUBCOLLECTION);
  return onSnapshot(
    query(reference, orderBy('createdAt', 'asc')),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => toGoal(item.id, item.data() as Record<string, unknown>)));
    },
    (error) => onError?.(error),
  );
};

/** Lee los objetivos una sola vez. */
export const getGoals = async (userId: string): Promise<Goal[]> => {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'digitalTwins', userId, GOALS_SUBCOLLECTION)));
  return snapshot.docs.map((item) => toGoal(item.id, item.data() as Record<string, unknown>));
};

export interface GoalInput {
  title: string;
  description: string;
  competencyId: string | null;
  competencyName: string;
  currentLevel: Level;
  targetLevel: Level;
  targetDate: string;
  status: GoalStatus;
  actions: GoalAction[];
}

/** Crea o actualiza un objetivo. */
export const saveGoal = async (
  userId: string,
  input: GoalInput,
  documentId: string,
): Promise<void> => {
  if (!db) return;
  const reference = doc(db, 'digitalTwins', userId, GOALS_SUBCOLLECTION, documentId);
  const snapshot = await getDoc(reference);
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    competencyId: input.competencyId,
    competencyName: input.competencyName.trim(),
    currentLevel: input.currentLevel,
    targetLevel: input.targetLevel,
    targetDate: input.targetDate,
    status: input.status,
    actions: input.actions.map((action) => ({
      id: action.id,
      title: action.title.trim(),
      done: Boolean(action.done),
    })),
    updatedAt: serverTimestamp(),
  };
  // `createdAt` solo se escribe al crear: las consultas ordenan por ese campo.
  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(reference, payload, { merge: true });
};

/** Actualiza parcialmente un objetivo. */
export const patchGoal = async (
  userId: string,
  goalId: string,
  changes: Partial<GoalInput>,
): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, 'digitalTwins', userId, GOALS_SUBCOLLECTION, goalId),
    { ...changes, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

/** Elimina un objetivo. */
export const deleteGoal = async (userId: string, goalId: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, 'digitalTwins', userId, GOALS_SUBCOLLECTION, goalId));
};
