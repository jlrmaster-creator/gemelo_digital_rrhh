/**
 * Acceso a los documentos de `users/{uid}`.
 *
 * El perfil de cuenta guarda solo lo necesario: nombre visible, puesto
 * profesional opcional y marcas de tiempo. No se solicitan datos personales
 * adicionales (minimizacion de datos).
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
import { asText, now, toTimestamp } from './shared';
import type { UserProfile } from '@/domain/types';

const USERS_COLLECTION = 'users';

const toUserProfile = (uid: string, data: Record<string, unknown> | undefined): UserProfile => ({
  uid,
  displayName: asText(data?.displayName),
  jobTitle: asText(data?.jobTitle),
  createdAt: toTimestamp(data?.createdAt),
  updatedAt: toTimestamp(data?.updatedAt),
});

/** Suscribe a los cambios del perfil de una persona. */
export const subscribeUserProfile = (
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange(null);
    return () => undefined;
  }
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(toUserProfile(uid, snapshot.data() as Record<string, unknown>));
    },
    (error) => onError?.(error),
  );
};

/** Lee el perfil de una persona una sola vez. */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  return toUserProfile(uid, snapshot.data() as Record<string, unknown>);
};

/** Crea el perfil de una persona recien registrada. */
export const createUserProfile = async (
  uid: string,
  data: { displayName: string; jobTitle: string },
): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      displayName: data.displayName.trim(),
      jobTitle: data.jobTitle.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/** Actualiza los datos del perfil. */
export const updateUserProfile = async (
  uid: string,
  data: { displayName: string; jobTitle: string },
): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      displayName: data.displayName.trim(),
      jobTitle: data.jobTitle.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/** Marca la fecha de actualizacion sin tocar el resto de campos. */
export const touchUserProfile = async (uid: string): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    { updatedAt: serverTimestamp() },
    { merge: true },
  );
};

export { now };
