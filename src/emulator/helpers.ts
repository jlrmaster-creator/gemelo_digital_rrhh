/**
 * Utilidades compartidas por las pruebas de reglas de seguridad.
 *
 * Las pruebas se ejecutan contra el Firebase Emulator Suite (Authentication +
 * Firestore). Cada contexto representa una persona distinta: las reglas se
 * evaluan con la identidad real de cada una.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

/**
 * Identificador de proyecto del emulador. El prefijo `demo-` es obligatorio:
 * garantiza que nunca se apuntan a un proyecto real de produccion.
 */
export const PROJECT_ID = 'demo-gemelo-digital';

/** Texto de las reglas que se cargan en el emulador. */
export const RULES_TEXT = readFileSync(
  fileURLToPath(new URL('../../firestore.rules', import.meta.url)),
  'utf8',
);

/** Crea un entorno de pruebas con las reglas cargadas. */
export const createTestEnvironment = (): Promise<RulesTestEnvironment> =>
  initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: RULES_TEXT,
    },
  });

/**
 * Cliente de Firestore de una persona autenticada.
 *
 * El emulador entrega una instancia del SDK interno (`@firebase/firestore`) que
 * en ejecucion es el mismo objeto que expone `firebase/firestore`; el cast
 * unicamente alinea los tipos entre los dos paquetes.
 */
export const asUser = (environment: RulesTestEnvironment, uid: string): Firestore =>
  environment.authenticatedContext(uid).firestore() as unknown as Firestore;

/** Cliente de Firestore de una persona sin sesion iniciada. */
export const asAnonymous = (environment: RulesTestEnvironment): Firestore =>
  environment.unauthenticatedContext().firestore() as unknown as Firestore;

/** Crea un gemelo digital valido. */
export const seedTwin = async (db: Firestore, uid: string): Promise<void> => {
  await setDoc(doc(db, 'digitalTwins', uid), {
    userId: uid,
    headline: 'Titular de prueba',
    summary: 'Resumen del gemelo digital de prueba.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Crea una competencia valida. */
export const seedCompetency = async (
  db: Firestore,
  uid: string,
  competencyId = 'comp-1',
  level = 3,
): Promise<void> => {
  await setDoc(doc(db, 'digitalTwins', uid, 'competencies', competencyId), {
    name: 'Comunicacion efectiva',
    category: 'Comunicacion',
    level,
    description: 'Describe la competencia.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Crea un objetivo valido. */
export const seedGoal = async (db: Firestore, uid: string, goalId = 'goal-1'): Promise<void> => {
  await setDoc(doc(db, 'digitalTwins', uid, 'goals', goalId), {
    title: 'Mejorar la comunicacion',
    description: 'Subir de nivel en comunicacion.',
    competencyId: 'comp-1',
    competencyName: 'Comunicacion efectiva',
    currentLevel: 3,
    targetLevel: 4,
    targetDate: '2026-12-31',
    status: 'in_progress',
    actions: [{ id: 'a1', title: 'Hacer una presentacion', done: false }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Crea un evento de historial valido. */
export const seedHistoryEvent = async (
  db: Firestore,
  uid: string,
  eventId = 'event-1',
): Promise<void> => {
  await setDoc(doc(db, 'digitalTwins', uid, 'history', eventId), {
    type: 'level_updated',
    title: 'Nivel actualizado',
    description: 'Cambio de nivel registrado.',
    competencyId: 'comp-1',
    competencyName: 'Comunicacion efectiva',
    fromLevel: 2,
    toLevel: 3,
    createdAt: serverTimestamp(),
  });
};

/** Crea un permiso de comparticion valido. */
export const seedGrant = async (
  db: Firestore,
  ownerUid: string,
  memberUid: string,
  options: { scope?: 'full' | 'summary'; revokedAt?: null | ReturnType<typeof serverTimestamp> } = {},
): Promise<void> => {
  await setDoc(doc(db, 'digitalTwins', ownerUid, 'sharing', memberUid), {
    memberUid,
    twinId: ownerUid,
    orgId: 'org-1',
    orgName: 'Equipo de Seleccion',
    scope: options.scope ?? 'full',
    grantedAt: serverTimestamp(),
    revokedAt: options.revokedAt ?? null,
  });
};

/** Crea una organizacion con su administrador y su codigo de invitacion. */
export const seedOrganization = async (
  db: Firestore,
  ownerUid: string,
  orgId = 'org-1',
  inviteCode = 'CODE1234',
): Promise<void> => {
  await setDoc(doc(db, 'organizations', orgId), {
    name: 'Equipo de Seleccion',
    inviteCode,
    createdBy: ownerUid,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'organizations', orgId, 'members', ownerUid), {
    uid: ownerUid,
    role: 'admin',
    email: 'admin@example.com',
    orgName: 'Equipo de Seleccion',
    orgCreatedAt: serverTimestamp(),
    addedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'invites', inviteCode), {
    code: inviteCode,
    orgId,
    orgName: 'Equipo de Seleccion',
    createdAt: serverTimestamp(),
  });
};

/**
 * Incorpora a una persona a una organizacion como miembro de RR. HH.
 *
 * Equivale a lo que hace la aplicacion al introducir un codigo de invitacion.
 */
export const seedMember = async (
  db: Firestore,
  orgId: string,
  uid: string,
  inviteCode = 'CODE1234',
  orgName = 'Equipo de Seleccion',
): Promise<void> => {
  await setDoc(doc(db, 'organizations', orgId, 'members', uid), {
    uid,
    role: 'hr',
    email: `${uid}@example.com`,
    orgName,
    orgCreatedAt: serverTimestamp(),
    inviteCode,
    addedAt: serverTimestamp(),
  });
};

/** Lee un documento (util para comprobar que existe tras una escritura). */
export const readDoc = async (db: Firestore, path: string): Promise<unknown> => {
  const snapshot = await getDoc(doc(db, path));
  return snapshot.exists() ? snapshot.data() : null;
};

/** Lee todos los documentos de una coleccion. */
export const readCollection = async (
  db: Firestore,
  path: string,
): Promise<unknown[]> => {
  const snapshot = await getDocs(collection(db, path));
  return snapshot.docs.map((item) => item.data());
};
