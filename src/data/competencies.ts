/**
 * Acceso a `digitalTwins/{uid}/competencies`.
 *
 * Las competencias son los datos que alimentan el mapa visual. Se guardan
 * como subcoleccion para que las consultas y las reglas de seguridad sean
 * simples y verificables.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { asLevel, asLongText, asText, toTimestamp } from './shared';
import type { Competency, Level } from '@/domain/types';

const COMPETENCIES_SUBCOLLECTION = 'competencies';

const toCompetency = (id: string, data: Record<string, unknown> | undefined): Competency => ({
  id,
  name: asText(data?.name),
  category: asText(data?.category, 'Sin categoria'),
  level: asLevel(data?.level, 1) as Level,
  description: asLongText(data?.description, 1000),
  createdAt: toTimestamp(data?.createdAt),
  updatedAt: toTimestamp(data?.updatedAt),
});

/** Suscribe a la lista de competencias de un gemelo digital. */
export const subscribeCompetencies = (
  userId: string,
  onChange: (competencies: Competency[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collection(db, 'digitalTwins', userId, COMPETENCIES_SUBCOLLECTION);
  return onSnapshot(
    query(reference, orderBy('createdAt', 'asc')),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => toCompetency(item.id, item.data() as Record<string, unknown>)));
    },
    (error) => onError?.(error),
  );
};

/** Lee las competencias una sola vez. */
export const getCompetencies = async (userId: string): Promise<Competency[]> => {
  if (!db) return [];
  const snapshot = await getDocs(
    query(collection(db, 'digitalTwins', userId, COMPETENCIES_SUBCOLLECTION)),
  );
  return snapshot.docs.map((item) => toCompetency(item.id, item.data() as Record<string, unknown>));
};

export interface CompetencyInput {
  id?: string;
  name: string;
  category: string;
  level: Level;
  description: string;
}

/** Crea o actualiza una competencia. */
export const saveCompetency = async (
  userId: string,
  input: CompetencyInput,
  documentId: string,
): Promise<void> => {
  if (!db) return;
  const reference = doc(db, 'digitalTwins', userId, COMPETENCIES_SUBCOLLECTION, documentId);
  const snapshot = await getDoc(reference);
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    category: input.category.trim() || 'Sin categoria',
    level: input.level,
    description: input.description.trim(),
    updatedAt: serverTimestamp(),
  };
  // `createdAt` solo se escribe al crear: las consultas ordenan por ese campo.
  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(reference, payload, { merge: true });
};

/** Elimina una competencia y los objetivos que la referencia. */
export const deleteCompetency = async (userId: string, competencyId: string): Promise<void> => {
  const database = db;
  if (!database) return;
  const batch = writeBatch(database);
  batch.delete(doc(database, 'digitalTwins', userId, COMPETENCIES_SUBCOLLECTION, competencyId));

  const goalsSnapshot = await getDocs(collection(database, 'digitalTwins', userId, 'goals'));
  goalsSnapshot.forEach((goalDoc) => {
    const data = goalDoc.data() as Record<string, unknown>;
    if (data.competencyId === competencyId) {
      batch.set(
        doc(database, 'digitalTwins', userId, 'goals', goalDoc.id),
        { competencyId: null, updatedAt: serverTimestamp() },
        { merge: true },
      );
    }
  });

  await batch.commit();
};
