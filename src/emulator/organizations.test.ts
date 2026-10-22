/**
 * Pruebas de las reglas de seguridad de organizaciones e invitaciones.
 *
 * El acceso de RR. HH. se organiza en torno a dos conceptos:
 *
 * - La `organizacion`, creada por una persona administradora.
 * - El `codigo de invitacion`, que funciona como credencial de un solo uso
 *   para incorporarse a la organizacion.
 *
 * La pertenencia se registra en un documento por persona
 * (`organizations/{orgId}/members/{uid}`). Las reglas comprueban que solo una
 * administradora puede publicar codigos y gestionar miembros, que el codigo es
 * necesario para incorporarse y que cada persona solo puede listar sus propias
 * organizaciones.
 */

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { asUser, createTestEnvironment, seedMember, seedOrganization } from './helpers';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await createTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
});

describe('organizaciones', () => {
  it('permite crear una organizacion siendo su administradora', async () => {
    const ana = asUser(environment, 'ana');
    await assertSucceeds(
      setDoc(doc(ana, 'organizations', 'org-1'), {
        name: 'Equipo de Seleccion',
        inviteCode: 'CODE1234',
        createdBy: 'ana',
        createdAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(ana, 'organizations', 'org-1', 'members', 'ana'), {
        uid: 'ana',
        role: 'admin',
        email: 'ana@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        addedAt: serverTimestamp(),
      }),
    );
  });

  it('impide registrar a otra persona sin codigo de invitacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    await assertFails(
      setDoc(doc(ana, 'organizations', 'org-1', 'members', 'luis'), {
        uid: 'luis',
        role: 'hr',
        email: 'luis@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        addedAt: serverTimestamp(),
      }),
    );
  });

  it('exige un nombre valido para la organizacion', async () => {
    const ana = asUser(environment, 'ana');
    await assertFails(
      setDoc(doc(ana, 'organizations', 'org-1'), {
        name: '',
        inviteCode: 'CODE1234',
        createdBy: 'ana',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('impide que una persona no miembro lea la organizacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(getDoc(doc(luis, 'organizations', 'org-1')));
    await assertFails(getDocs(collection(luis, 'organizations')));
  });

  it('impide que una persona que no es administradora modifique la organizacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');
    await seedMember(ana, 'org-1', 'luis');

    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'organizations', 'org-1'), { name: 'Otro nombre' }, { merge: true }),
    );
  });

  it('permite a los miembros listar sus organizaciones', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const snapshot = await getDocs(
      query(collectionGroup(ana, 'members'), where('uid', '==', 'ana')),
    );
    expect(snapshot.docs).toHaveLength(1);
  });

  it('no permite listar las organizaciones de otra persona', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');
    await seedMember(ana, 'org-1', 'luis');

    await assertFails(
      getDocs(query(collectionGroup(ana, 'members'), where('uid', '==', 'luis'))),
    );
  });

  it('permite a la administradora leer los miembros de su organizacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const snapshot = await getDocs(collection(ana, 'organizations', 'org-1', 'members'));
    expect(snapshot.docs).toHaveLength(1);
  });

  it('impide que una persona ajena lea los miembros de la organizacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(getDocs(collection(luis, 'organizations', 'org-1', 'members')));
  });
});

describe('codigos de invitacion', () => {
  it('permite a la administradora publicar el codigo', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');
    await assertSucceeds(
      setDoc(doc(ana, 'invites', 'CODE1234'), {
        code: 'CODE1234',
        orgId: 'org-1',
        orgName: 'Equipo de Seleccion',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('impide que otra persona publique codigos de invitacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'invites', 'CODE9999'), {
        code: 'CODE9999',
        orgId: 'org-1',
        orgName: 'Equipo de Seleccion',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('permite a una persona autenticada consultar un codigo', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertSucceeds(getDoc(doc(luis, 'invites', 'CODE1234')));
  });
});

describe('incorporacion a una organizacion', () => {
  it('permite incorporarse con un codigo valido', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertSucceeds(
      setDoc(doc(luis, 'organizations', 'org-1', 'members', 'luis'), {
        uid: 'luis',
        role: 'hr',
        email: 'luis@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        inviteCode: 'CODE1234',
        addedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(luis, 'organizations', 'org-1')));
  });

  it('impide incorporarse sin un codigo valido', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'organizations', 'org-1', 'members', 'luis'), {
        uid: 'luis',
        role: 'hr',
        email: 'luis@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        inviteCode: 'CODE9999',
        addedAt: serverTimestamp(),
      }),
    );
  });

  it('impide incorporarse con un codigo de otra organizacion', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana', 'org-1', 'CODE1234');
    await seedOrganization(ana, 'ana', 'org-2', 'CODE5678');

    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'organizations', 'org-1', 'members', 'luis'), {
        uid: 'luis',
        role: 'hr',
        email: 'luis@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        inviteCode: 'CODE5678',
        addedAt: serverTimestamp(),
      }),
    );
  });

  it('impide que un miembro se convierta en administradora por su cuenta', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertSucceeds(
      setDoc(doc(luis, 'organizations', 'org-1', 'members', 'luis'), {
        uid: 'luis',
        role: 'hr',
        email: 'luis@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        inviteCode: 'CODE1234',
        addedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(
        doc(luis, 'organizations', 'org-1', 'members', 'luis'),
        { role: 'admin' },
        { merge: true },
      ),
    );
  });

  it('impide que un miembro cambie su propia pertenencia', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');
    await seedMember(ana, 'org-1', 'luis');

    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(
        doc(luis, 'organizations', 'org-1', 'members', 'luis'),
        { uid: 'ana' },
        { merge: true },
      ),
    );
  });

  it('permite a la administradora cambiar el rol de un miembro', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertSucceeds(
      setDoc(doc(luis, 'organizations', 'org-1', 'members', 'luis'), {
        uid: 'luis',
        role: 'hr',
        email: 'luis@example.com',
        orgName: 'Equipo de Seleccion',
        orgCreatedAt: serverTimestamp(),
        inviteCode: 'CODE1234',
        addedAt: serverTimestamp(),
      }),
    );

    await assertSucceeds(
      setDoc(
        doc(ana, 'organizations', 'org-1', 'members', 'luis'),
        { role: 'admin' },
        { merge: true },
      ),
    );
  });

  it('impide a la administradora eliminar su propio registro', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'organizations', 'org-1', 'members', 'ana'), { role: 'hr' }, { merge: true }),
    );
  });

  it('permite a la administradora retirar a un miembro', async () => {
    const ana = asUser(environment, 'ana');
    await seedOrganization(ana, 'ana');
    await seedMember(ana, 'org-1', 'luis');

    await assertSucceeds(
      deleteDoc(doc(ana, 'organizations', 'org-1', 'members', 'luis')),
    );

    const luis = asUser(environment, 'luis');
    await assertFails(getDoc(doc(luis, 'organizations', 'org-1')));
  });
});
