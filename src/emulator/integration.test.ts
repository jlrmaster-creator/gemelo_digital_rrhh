/**
 * Prueba de integracion del flujo de comparticion.
 *
 * A diferencia de las demas pruebas de este directorio, aqui no se escriben
 * documentos "a mano": se ejecuta el codigo real de la aplicacion
 * (`src/data`) contra los emuladores de Firebase y con las reglas de
 * seguridad reales. Sirve para comprobar que la aplicacion y las reglas
 * cuentan la misma historia:
 *
 * 1. Una persona crea su perfil, su gemelo digital y una organizacion.
 * 2. Otra persona se incorpora a la organizacion con el codigo de invitacion.
 * 3. La primera comparte su gemelo digital con la organizacion.
 * 4. La segunda, desde el area de RR. HH., ve el perfil compartido.
 *
 * La prueba se niega a ejecutarse si el proyecto no es el de demostracion:
 * jamas debe tocar el proyecto real de Firebase.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '@/firebase/client';
import { createUserProfile, getUserProfile } from '@/data/users';
import { getTwin, saveTwin } from '@/data/twins';
import {
  createOrganization,
  findInvite,
  getMyOrganizations,
  getOrganizationMembers,
  joinOrganization,
  type InviteInfo,
} from '@/data/organizations';
import { getSharingGrants, shareWithOrganization, subscribeReceivedGrants } from '@/data/sharing';
import type { SharedProfileGrant } from '@/data/sharing';

const DEMO_PROJECT_ID = 'demo-gemelo-digital';
const PASSWORD = 'Contrasena1!';

interface TestUser {
  uid: string;
  email: string;
}

const requireDb = () => {
  if (!db) throw new Error('Firestore no esta configurado en el emulador.');
  return db;
};

const requireAuth = () => {
  if (!auth) throw new Error('Authentication no esta configurado en el emulador.');
  return auth;
};

const register = async (email: string): Promise<TestUser> => {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email, PASSWORD);
  return { uid: credential.user.uid, email };
};

const signIn = async (email: string): Promise<void> => {
  await signInWithEmailAndPassword(requireAuth(), email, PASSWORD);
};

/**
 * Espera la primera entrega de una suscripcion y devuelve su valor.
 *
 * `create` recibe los callbacks y devuelve la funcion de cancelacion.
 */
const firstValue = <T,>(
  create: (onChange: (value: T) => void, onError?: (error: Error) => void) => () => void,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('No se ha recibido ninguna actualizacion.')),
      30000,
    );
    const unsubscribe = create(
      (value) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const ana: TestUser = { uid: '', email: 'ana@example.com' };
const luis: TestUser = { uid: '', email: 'luis@example.com' };
const marta: TestUser = { uid: '', email: 'marta@example.com' };
let orgId = '';

beforeAll(() => {
  if (firebaseConfig.projectId !== DEMO_PROJECT_ID) {
    throw new Error(
      `La prueba de integracion solo puede ejecutarse contra el proyecto "${DEMO_PROJECT_ID}" ` +
        `(proyecto detectado: "${firebaseConfig.projectId ?? 'sin configurar'}").`,
    );
  }
});

afterAll(async () => {
  await signOut(requireAuth()).catch(() => undefined);
});

describe('flujo completo de comparticion', () => {
  it('permite crear la organizacion, incorporarse y compartir el gemelo digital', async () => {
    // 1. Ana se registra y crea su perfil y su gemelo digital.
    Object.assign(ana, await register(ana.email));
    await createUserProfile(ana.uid, { displayName: 'Ana Torres', jobTitle: 'Tecnica de RR. HH.' });
    await saveTwin(ana.uid, {
      headline: 'Responsable de seleccion',
      summary: 'Perfil profesional de Ana Torres.',
    });
    expect((await getTwin(ana.uid))?.headline).toBe('Responsable de seleccion');

    // 2. Ana crea la organizacion y obtiene el codigo de invitacion.
    const created = await createOrganization(ana.uid, 'Equipo de Seleccion', ana.email);
    orgId = created.orgId;
    expect(created.inviteCode).toHaveLength(12);

    // 3. Luis se incorpora con el codigo.
    await signOut(requireAuth());
    Object.assign(luis, await register(luis.email));
    const invite: InviteInfo | null = await findInvite(created.inviteCode);
    expect(invite).not.toBeNull();
    expect(invite?.orgId).toBe(orgId);
    await joinOrganization(luis.uid, luis.email, invite as InviteInfo);

    // 4. Luis ve la organizacion a la que se ha incorporado.
    const organizations = await getMyOrganizations(luis.uid);
    expect(organizations).toHaveLength(1);
    expect(organizations[0]?.id).toBe(orgId);
    expect(organizations[0]?.name).toBe('Equipo de Seleccion');

    // 5. Ana comparte su gemelo digital con la organizacion.
    await signOut(requireAuth());
    await signIn(ana.email);
    const members = await getOrganizationMembers(orgId);
    expect(members.map((member) => member.uid).sort()).toEqual([ana.uid, luis.uid].sort());
    await shareWithOrganization(ana.uid, orgId, 'Equipo de Seleccion', 'full', [
      ana.uid,
      luis.uid,
    ]);
    const grants = await getSharingGrants(ana.uid);
    expect(grants).toHaveLength(1);
    expect(grants[0]?.memberUid).toBe(luis.uid);

    // 6. Luis, desde RR. HH., recibe el permiso y puede leer el perfil.
    await signOut(requireAuth());
    await signIn(luis.email);
    const received = await firstValue<SharedProfileGrant[]>((onChange, onError) =>
      subscribeReceivedGrants(luis.uid, onChange, onError),
    );
    expect(received).toHaveLength(1);
    expect(received[0]?.twinId).toBe(ana.uid);
    expect(received[0]?.scope).toBe('full');

    const sharedTwin = await getTwin(ana.uid);
    expect(sharedTwin?.headline).toBe('Responsable de seleccion');
    const sharedProfile = await getUserProfile(ana.uid);
    expect(sharedProfile?.displayName).toBe('Ana Torres');
  });

  it('impide que una persona sin permiso vea el gemelo digital ajeno', async () => {
    await signOut(requireAuth());
    Object.assign(marta, await register(marta.email));

    await assertFails(getDoc(doc(requireDb(), 'digitalTwins', ana.uid)));
    await assertFails(getDoc(doc(requireDb(), 'users', ana.uid)));
    await assertFails(
      getDocs(collection(requireDb(), 'digitalTwins', ana.uid, 'competencies')),
    );
    await assertFails(getDoc(doc(requireDb(), 'organizations', orgId)));
    await assertFails(getDocs(collection(requireDb(), 'organizations', orgId, 'members')));
  });

  it('no permite listar los permisos de otra persona', async () => {
    await signIn(marta.email);
    await assertFails(
      getDocs(
        query(collectionGroup(requireDb(), 'sharing'), where('memberUid', '==', ana.uid)),
      ),
    );
    await assertFails(
      getDocs(query(collectionGroup(requireDb(), 'members'), where('uid', '==', ana.uid))),
    );
  });

  it('impide que otra persona conceda permisos sobre un gemelo digital ajeno', async () => {
    await signIn(marta.email);
    await assertFails(
      shareWithOrganization(ana.uid, orgId, 'Equipo de Seleccion', 'full', [marta.uid]),
    );
  });
});
