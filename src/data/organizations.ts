/**
 * Acceso a `organizations`, `organizations/{orgId}/members` e `invites`.
 *
 * Modelo de acceso a los perfiles compartidos:
 *
 * 1. Una persona crea una organizacion y se convierte en su `admin`.
 * 2. El admin genera un codigo de invitacion y se lo facilita a las personas
 *    de RR. HH. que quiere incorporar.
 * 3. Quien recibe el codigo lo introduce en la aplicacion, se une a la
 *    organizacion como `hr` y puede ver los perfiles que la organizacion
 *    tenga compartidos con el.
 * 4. Cada persona comparte su propio gemelo digital con una organizacion a la
 *    que pertenece. El permiso se materializa en un documento por persona
 *    (`digitalTwins/{duenio}/sharing/{miembroUid}`), de forma que las reglas
 *    de seguridad pueden comprobar el acceso sin iterar en tiempo de
 *    ejecucion.
 *
 * La pertenencia a una organizacion vive en un documento por persona
 * (`organizations/{orgId}/members/{uid}`). Es la unica fuente de verdad: las
 * reglas de seguridad comprueban la pertenencia y el rol con `exists()` y
 * `get()`, sin recorrer listas. Cada documento de miembro guarda tambien el
 * nombre de la organizacion para que la persona pueda listar sus
 * organizaciones sin permisos adicionales sobre documentos ajenos.
 */

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { asText, createId, toTimestamp } from './shared';
import type { Organization, OrganizationMember, OrganizationRole } from '@/domain/types';

const ORGANIZATIONS_COLLECTION = 'organizations';
const MEMBERS_SUBCOLLECTION = 'members';
const INVITES_COLLECTION = 'invites';

/**
 * Convierte un documento de miembro en la organizacion a la que pertenece.
 *
 * La ruta del documento es `organizations/{orgId}/members/{uid}`; el nombre
 * de la organizacion esta desnormalizado en el propio documento de miembro
 * para no necesitar leer documentos ajenos.
 */
const toOrganizationFromMember = (item: QueryDocumentSnapshot): Organization => {
  const data = item.data() as Record<string, unknown>;
  const orgId = item.ref.parent.parent?.id ?? asText(data?.orgId);
  return {
    id: orgId,
    name: asText(data?.orgName),
    createdAt: toTimestamp(data?.orgCreatedAt),
  };
};

const toMember = (uid: string, data: Record<string, unknown> | undefined): OrganizationMember => {
  const role = asText(data?.role, 'hr');
  return {
    uid,
    role: role === 'admin' ? 'admin' : 'hr',
    email: asText(data?.email),
    addedAt: toTimestamp(data?.addedAt),
  };
};

/**
 * Suscribe a las organizaciones de las que forma parte una persona.
 *
 * La consulta es de grupo de colecciones sobre `members`: las reglas de
 * seguridad permiten listar unicamente los documentos cuyo identificador
 * coincide con el uid de la persona autenticada.
 */
export const subscribeMyOrganizations = (
  uid: string,
  onChange: (organizations: Organization[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collectionGroup(db, MEMBERS_SUBCOLLECTION);
  return onSnapshot(
    query(reference, where('uid', '==', uid)),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => toOrganizationFromMember(item)));
    },
    (error) => onError?.(error),
  );
};

/** Lee las organizaciones de una persona una sola vez. */
export const getMyOrganizations = async (uid: string): Promise<Organization[]> => {
  if (!db) return [];
  const snapshot = await getDocs(
    query(collectionGroup(db, MEMBERS_SUBCOLLECTION), where('uid', '==', uid)),
  );
  return snapshot.docs.map((item) => toOrganizationFromMember(item));
};

/** Crea una organizacion. Quien la crea queda como `admin`. */
export const createOrganization = async (
  uid: string,
  name: string,
  email: string,
): Promise<{ orgId: string; inviteCode: string }> => {
  if (!db) throw new Error('Firebase no esta configurado en este entorno.');
  const orgId = createId();
  const inviteCode = createId().replace(/-/g, '').slice(0, 12).toUpperCase();
  const orgName = name.trim();

  await setDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), {
    name: orgName,
    inviteCode,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId, MEMBERS_SUBCOLLECTION, uid), {
    uid,
    role: 'admin',
    email: email.trim(),
    orgName,
    orgCreatedAt: serverTimestamp(),
    addedAt: serverTimestamp(),
  });

  // El codigo se publica como credencial de incorporacion: sin este documento
  // ninguna persona podria unirse a la organizacion.
  await publishInvite(orgId, orgName, inviteCode);
  return { orgId, inviteCode };
};

/** Lee los miembros de una organizacion. */
export const getOrganizationMembers = async (orgId: string): Promise<OrganizationMember[]> => {
  if (!db) return [];
  const snapshot = await getDocs(
    collection(db, ORGANIZATIONS_COLLECTION, orgId, MEMBERS_SUBCOLLECTION),
  );
  return snapshot.docs.map((item) => toMember(item.id, item.data() as Record<string, unknown>));
};

/** Suscribe a los miembros de una organizacion. */
export const subscribeOrganizationMembers = (
  orgId: string,
  onChange: (members: OrganizationMember[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const reference = collection(db, ORGANIZATIONS_COLLECTION, orgId, MEMBERS_SUBCOLLECTION);
  return onSnapshot(reference, (snapshot) => {
    onChange(snapshot.docs.map((item) => toMember(item.id, item.data() as Record<string, unknown>)));
  }, (error) => onError?.(error));
};

/** Actualiza el rol de un miembro (solo admins). */
export const setMemberRole = async (
  orgId: string,
  memberUid: string,
  role: OrganizationRole,
): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, ORGANIZATIONS_COLLECTION, orgId, MEMBERS_SUBCOLLECTION, memberUid),
    { role },
    { merge: true },
  );
};

/** Elimina a un miembro de la organizacion (solo admins). */
export const removeMember = async (orgId: string, memberUid: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId, MEMBERS_SUBCOLLECTION, memberUid));
};

/** Informacion publica de una invitacion (codigo -> organizacion). */
export interface InviteInfo {
  code: string;
  orgId: string;
  orgName: string;
}

/** Busca una organizacion a partir de su codigo de invitacion. */
export const findInvite = async (code: string): Promise<InviteInfo | null> => {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, INVITES_COLLECTION, code.trim().toUpperCase()));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Record<string, unknown>;
  return {
    code: asText(data?.code),
    orgId: asText(data?.orgId),
    orgName: asText(data?.orgName),
  };
};

/** Publica (o renueva) el codigo de invitacion de una organizacion. */
export const publishInvite = async (
  orgId: string,
  orgName: string,
  inviteCode: string,
): Promise<void> => {
  if (!db) return;
  await setDoc(
    doc(db, INVITES_COLLECTION, inviteCode),
    { code: inviteCode, orgId, orgName, createdAt: serverTimestamp() },
    { merge: true },
  );
};

/** Se une a una organizacion usando un codigo de invitacion valido. */
export const joinOrganization = async (
  uid: string,
  email: string,
  invite: InviteInfo,
): Promise<void> => {
  if (!db) throw new Error('Firebase no esta configurado en este entorno.');

  // La incorporacion solo crea el documento de miembro: no modifica el
  // documento de la organizacion, que es de la administradora.
  await setDoc(doc(db, ORGANIZATIONS_COLLECTION, invite.orgId, MEMBERS_SUBCOLLECTION, uid), {
    uid,
    role: 'hr',
    email: email.trim(),
    orgName: invite.orgName,
    orgCreatedAt: serverTimestamp(),
    inviteCode: invite.code,
    addedAt: serverTimestamp(),
  });
};
