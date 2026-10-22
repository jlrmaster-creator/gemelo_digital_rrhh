/**
 * Acceso al documento principal `digitalTwins/{uid}`.
 *
 * Cada persona tiene como maximo un gemelo digital y el identificador del
 * documento coincide con su `uid`. De este modo las reglas de seguridad
 * pueden comprobar la propiedad sin depender de campos adicionales.
 */

import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { asLongText, asText, toTimestamp } from './shared';
import type { DigitalTwin } from '@/domain/types';

export const TWINS_COLLECTION = 'digitalTwins';

const toDigitalTwin = (userId: string, data: Record<string, unknown> | undefined): DigitalTwin => ({
  userId,
  headline: asText(data?.headline),
  summary: asLongText(data?.summary),
  createdAt: toTimestamp(data?.createdAt),
  updatedAt: toTimestamp(data?.updatedAt),
});

/** Suscribe a los cambios del gemelo digital de una persona. */
export const subscribeTwin = (
  userId: string,
  onChange: (twin: DigitalTwin | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange(null);
    return () => undefined;
  }
  return onSnapshot(
    doc(db, TWINS_COLLECTION, userId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(toDigitalTwin(userId, snapshot.data() as Record<string, unknown>));
    },
    (error) => onError?.(error),
  );
};

/** Lee el gemelo digital una sola vez. */
export const getTwin = async (userId: string): Promise<DigitalTwin | null> => {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, TWINS_COLLECTION, userId));
  if (!snapshot.exists()) return null;
  return toDigitalTwin(userId, snapshot.data() as Record<string, unknown>);
};

/** Crea o actualiza el gemelo digital. */
export const saveTwin = async (
  userId: string,
  data: { headline: string; summary: string },
): Promise<void> => {
  if (!db) return;
  const reference = doc(db, TWINS_COLLECTION, userId);
  const snapshot = await getDoc(reference);
  const payload: Record<string, unknown> = {
    userId,
    headline: data.headline.trim(),
    summary: data.summary.trim(),
    updatedAt: serverTimestamp(),
  };
  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }
  await setDoc(reference, payload, { merge: true });
};

/** Marca la fecha de actualizacion del gemelo digital. */
export const touchTwin = async (userId: string): Promise<void> => {
  if (!db) return;
  await setDoc(doc(db, TWINS_COLLECTION, userId), { updatedAt: serverTimestamp() }, { merge: true });
};
