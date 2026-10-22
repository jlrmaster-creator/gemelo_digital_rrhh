/**
 * Pruebas de las reglas de comparticion del gemelo digital.
 *
 * El permiso de acceso es un documento por persona
 * (`digitalTwins/{duenio}/sharing/{miembroUid}`). Estas pruebas comprueban que:
 *
 * - Solo la persona duena concede permisos.
 * - Un permiso activo da acceso a los datos compartidos.
 * - Un permiso revocado deja de dar acceso.
 * - El alcance `summary` no da acceso al historial de evolucion.
 * - Cada miembro ve unicamente su propio permiso.
 */

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  asUser,
  createTestEnvironment,
  seedCompetency,
  seedGoal,
  seedGrant,
  seedHistoryEvent,
  seedTwin,
} from './helpers';

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

describe('permisos de acceso', () => {
  it('permite a la persona duena conceder un permiso', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertSucceeds(seedGrant(ana, 'ana', 'luis'));
  });

  it('impide que otra persona conceda permisos en nombre ajeno', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(seedGrant(luis, 'ana', 'luis'));
    await assertFails(seedGrant(luis, 'ana', 'marta'));
  });

  it('impide conceder un permiso con un alcance no valido', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'sharing', 'luis'), {
        memberUid: 'luis',
        twinId: 'ana',
        orgId: 'org-1',
        orgName: 'Equipo de Seleccion',
        scope: 'todo',
        grantedAt: serverTimestamp(),
        revokedAt: null,
      }),
    );
  });

  it('permite a cada miembro ver unicamente su propio permiso', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis');
    await seedGrant(ana, 'ana', 'marta');

    const luis = asUser(environment, 'luis');
    await assertSucceeds(getDoc(doc(luis, 'digitalTwins', 'ana', 'sharing', 'luis')));
    await assertFails(getDoc(doc(luis, 'digitalTwins', 'ana', 'sharing', 'marta')));
  });

  it('permite a la persona duena ver todos sus permisos', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis');
    const snapshot = await getDocs(collection(ana, 'digitalTwins', 'ana', 'sharing'));
    expect(snapshot.docs).toHaveLength(1);
  });
});

describe('acceso con permiso activo', () => {
  it('permite a la persona con permiso leer el gemelo y las competencias', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedCompetency(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis');

    const luis = asUser(environment, 'luis');
    await assertSucceeds(getDoc(doc(luis, 'digitalTwins', 'ana')));
    await assertSucceeds(getDoc(doc(luis, 'digitalTwins', 'ana', 'competencies', 'comp-1')));
    await assertSucceeds(getDoc(doc(luis, 'users', 'ana')));
  });

  it('no permite modificar el gemelo ajeno aunque haya permiso', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis');

    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'digitalTwins', 'ana'), {
        userId: 'ana',
        headline: 'Modificado por RR. HH.',
        summary: '',
      }),
    );
    await assertFails(
      setDoc(doc(luis, 'digitalTwins', 'ana', 'competencies', 'comp-nuevo'), {
        name: 'Competencia ajena',
        category: 'Tecnica',
        level: 3,
        description: 'No deberia permitirse.',
      }),
    );
  });

  it('el alcance summary oculta el historial de evolucion', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedHistoryEvent(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis', { scope: 'summary' });

    const luis = asUser(environment, 'luis');
    await assertFails(getDoc(doc(luis, 'digitalTwins', 'ana', 'history', 'event-1')));
  });

  it('el alcance full permite consultar el historial de evolucion', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedHistoryEvent(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis', { scope: 'full' });

    const luis = asUser(environment, 'luis');
    await assertSucceeds(getDoc(doc(luis, 'digitalTwins', 'ana', 'history', 'event-1')));
  });

  it('los objetivos se comparten con cualquier alcance activo', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedGoal(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis', { scope: 'summary' });

    const luis = asUser(environment, 'luis');
    await assertSucceeds(getDoc(doc(luis, 'digitalTwins', 'ana', 'goals', 'goal-1')));
  });
});

describe('acceso con permiso revocado', () => {
  it('un permiso revocado deja de dar acceso a los datos', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedCompetency(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis');
    await setDoc(
      doc(ana, 'digitalTwins', 'ana', 'sharing', 'luis'),
      { revokedAt: serverTimestamp() },
      { merge: true },
    );

    const luis = asUser(environment, 'luis');
    await assertFails(getDoc(doc(luis, 'digitalTwins', 'ana')));
    await assertFails(getDoc(doc(luis, 'digitalTwins', 'ana', 'competencies', 'comp-1')));
    await assertFails(getDoc(doc(luis, 'users', 'ana')));
  });

  it('la persona duena puede retirar y volver a conceder el permiso', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedGrant(ana, 'ana', 'luis');

    await assertSucceeds(
      setDoc(
        doc(ana, 'digitalTwins', 'ana', 'sharing', 'luis'),
        { revokedAt: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(ana, 'digitalTwins', 'ana', 'sharing', 'luis'),
        { revokedAt: null, grantedAt: serverTimestamp() },
        { merge: true },
      ),
    );

    const luis = asUser(environment, 'luis');
    await assertSucceeds(getDoc(doc(luis, 'digitalTwins', 'ana')));
  });
});
