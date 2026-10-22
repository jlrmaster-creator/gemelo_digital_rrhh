/**
 * Acceso a `digitalTwins/{uid}/sharing`.
 *
 * Cada documento es un permiso explicito de acceso concedido por la propia
 * persona a un miembro concreto de RR. HH. (`documentId = memberUid`).
 *
 * El permiso se materializa por persona (no solo por organizacion) porque las
 * reglas de seguridad de Firestore no pueden recorrer listas en tiempo de
 * ejecucion: de este modo la comprobacion es directa y verificable.
 *
 * - `revokedAt`: al retirar el permiso se marca la fecha, de modo que queda
 *   constancia de cuando se dejo de compartir.
 */

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { asText, toTimestamp } from './shared';
import type { SharingGrant, SharingScope } from '@/domain/types';

const SHARING_SUBCOLLECTION = 'sharing';

const toSharingGrant = (
  memberUid: string,
  data: Record<string, unknown> | undefined,
): SharingGrant => {
  const scope = asText(data?.scope, 'full');
  return {
    memberUid,
    orgId: asText(data?.orgId),
    orgName: asText(data?.orgName),
    grantedAt: toTimestamp(data?.grantedAt),
    revokedAt: toTimestamp(data?.revokedAt),
    scope: scope === 'summary' ? 'summary' : 'full',
  };
};

/** Suscribe a los permisos de comparticion de un gemelo digital. */
export const subscribeSharingGrants = (
  userId: string,
  onChange: (grants: SharingGrant[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collection(db, 'digitalTwins', userId, SHARING_SUBCOLLECTION);
  return onSnapshot(
    reference,
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => toSharingGrant(item.id, item.data() as Record<string, unknown>)),
      );
    },
    (error) => onError?.(error),
  );
};

/** Lee los permisos de comparticion una sola vez. */
export const getSharingGrants = async (userId: string): Promise<SharingGrant[]> => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'digitalTwins', userId, SHARING_SUBCOLLECTION));
  return snapshot.docs.map((item) => toSharingGrant(item.id, item.data() as Record<string, unknown>));
};

/**
 * Comparte el gemelo digital con todos los miembros de una organizacion.
 *
 * Se crea un permiso por miembro (excepto la persona duena). Si ya existia
 * un permiso, se renueva con la fecha y el alcance actuales.
 */
export const shareWithOrganization = async (
  ownerUid: string,
  orgId: string,
  orgName: string,
  scope: SharingScope,
  memberUids: string[],
): Promise<void> => {
  const database = db;
  if (!database) return;
  const targets = memberUids.filter((uid) => uid && uid !== ownerUid);
  const batch = writeBatch(database);
  targets.forEach((memberUid) => {
    batch.set(
      doc(database, 'digitalTwins', ownerUid, SHARING_SUBCOLLECTION, memberUid),
      {
        memberUid,
        twinId: ownerUid,
        orgId,
        orgName: orgName.trim(),
        scope,
        grantedAt: serverTimestamp(),
        revokedAt: null,
      },
      { merge: true },
    );
  });
  await batch.commit();
};

/** Retira el permiso de acceso a un miembro concreto. */
export const revokeSharingMember = async (ownerUid: string, memberUid: string): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, 'digitalTwins', ownerUid, SHARING_SUBCOLLECTION, memberUid),
    { revokedAt: serverTimestamp() },
    { merge: true },
  );
};

/** Elimina definitivamente el permiso de un miembro. */
export const deleteSharingMember = async (ownerUid: string, memberUid: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, 'digitalTwins', ownerUid, SHARING_SUBCOLLECTION, memberUid));
};

/** Identificador del gemelo digital al que pertenece un permiso. */
export interface SharedProfileGrant extends SharingGrant {
  memberUid: string;
  twinId: string;
}

/** Permisos que el usuario autenticado ha recibido como miembro de RR. HH. */
export const subscribeReceivedGrants = (
  memberUid: string,
  onChange: (grants: SharedProfileGrant[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collectionGroup(db, SHARING_SUBCOLLECTION);
  return onSnapshot(
    query(reference, where('memberUid', '==', memberUid)),
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => {
          const data = item.data() as Record<string, unknown>;
          // La ruta es `digitalTwins/{duenio}/sharing/{miembroUid}`: el
          // identificador del gemelo digital es el documento que contiene la
          // subcoleccion de permisos.
          const twinId = item.ref.parent.parent?.id ?? asText(data?.twinId);
          const scope = asText(data?.scope, 'full');
          return {
            memberUid: asText(data?.memberUid, memberUid),
            orgId: asText(data?.orgId),
            orgName: asText(data?.orgName),
            grantedAt: toTimestamp(data?.grantedAt),
            revokedAt: toTimestamp(data?.revokedAt),
            scope: scope === 'summary' ? 'summary' : 'full',
            twinId,
          };
        }),
      );
    },
    (error) => onError?.(error),
  );
};
