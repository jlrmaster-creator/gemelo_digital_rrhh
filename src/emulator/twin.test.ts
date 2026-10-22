/**
 * Pruebas de las reglas de seguridad del gemelo digital.
 *
 * Objetivo: comprobar que solo la persona duena puede leer y modificar su
 * gemelo digital, que los datos se validan y que nadie mas puede saltarse las
 * reglas (por ejemplo, escribiendo un documento con el `userId` de otra
 * persona).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
import {
  asAnonymous,
  asUser,
  createTestEnvironment,
  readCollection,
  seedCompetency,
  seedGoal,
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

describe('gemelo digital: propiedad de los datos', () => {
  it('permite a la persona duena crear y leer su gemelo', async () => {
    const ana = asUser(environment, 'ana');
    await assertSucceeds(seedTwin(ana, 'ana'));
    await assertSucceeds(getDoc(doc(ana, 'digitalTwins', 'ana')));
  });

  it('impide el acceso a quien no ha iniciado sesion', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');

    const anonymous = asAnonymous(environment);
    await assertFails(getDoc(doc(anonymous, 'digitalTwins', 'ana')));
    await assertFails(
      setDoc(doc(anonymous, 'digitalTwins', 'ana'), {
        userId: 'ana',
        headline: 'Intruso',
        summary: '',
      }),
    );
  });

  it('impide que otra persona lea o modifique el gemelo', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(getDoc(doc(luis, 'digitalTwins', 'ana')));
    await assertFails(
      setDoc(doc(luis, 'digitalTwins', 'ana'), {
        userId: 'ana',
        headline: 'Modificado por otro',
        summary: '',
      }),
    );
    await assertFails(deleteDoc(doc(luis, 'digitalTwins', 'ana')));
  });

  it('no permite escribir el gemelo de otra persona con su propio userId', async () => {
    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'digitalTwins', 'luis'), {
        userId: 'ana',
        headline: 'Suplantado',
        summary: '',
      }),
    );
  });

  it('exige que el documento tenga los campos obligatorios', async () => {
    const ana = asUser(environment, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana'), {
        userId: 'ana',
        headline: 42,
        summary: 'Resumen',
      }),
    );
  });
});

describe('gemelo digital: competencias, objetivos e historial', () => {
  it('permite a la persona duena gestionar sus competencias', async () => {
    const ana = asUser(environment, 'ana');
    await assertSucceeds(seedTwin(ana, 'ana'));
    await assertSucceeds(seedCompetency(ana, 'ana'));
    await assertSucceeds(getDoc(doc(ana, 'digitalTwins', 'ana', 'competencies', 'comp-1')));
    await assertSucceeds(deleteDoc(doc(ana, 'digitalTwins', 'ana', 'competencies', 'comp-1')));
  });

  it('rechaza niveles fuera de la escala 1-5', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'competencies', 'comp-fuera'), {
        name: 'Nivel invalido',
        category: 'Tecnica',
        level: 7,
        description: 'No deberia permitirse.',
      }),
    );
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'competencies', 'comp-cero'), {
        name: 'Nivel invalido',
        category: 'Tecnica',
        level: 0,
        description: 'No deberia permitirse.',
      }),
    );
  });

  it('rechaza competencias sin nombre', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'competencies', 'comp-sin-nombre'), {
        name: '',
        category: 'Tecnica',
        level: 3,
        description: 'No deberia permitirse.',
      }),
    );
  });

  it('impide que otra persona anada competencias', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(seedCompetency(luis, 'ana'));
  });

  it('permite a la persona duena gestionar objetivos e historial', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertSucceeds(seedGoal(ana, 'ana'));
    await assertSucceeds(seedHistoryEvent(ana, 'ana'));
  });

  it('rechaza objetivos cuyo nivel objetivo sea inferior al actual', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'goals', 'goal-invalido'), {
        title: 'Objetivo incoherente',
        description: 'No deberia permitirse.',
        competencyId: null,
        competencyName: 'Comunicacion efectiva',
        currentLevel: 4,
        targetLevel: 2,
        targetDate: '2026-12-31',
        status: 'pending',
        actions: [],
      }),
    );
  });

  it('rechaza objetivos con un estado no valido', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'goals', 'goal-estado'), {
        title: 'Objetivo con estado invalido',
        description: 'No deberia permitirse.',
        competencyId: null,
        competencyName: 'Comunicacion efectiva',
        currentLevel: 2,
        targetLevel: 3,
        targetDate: '2026-12-31',
        status: 'inventado',
        actions: [],
      }),
    );
  });

  it('rechaza eventos de historial con un tipo desconocido', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await assertFails(
      setDoc(doc(ana, 'digitalTwins', 'ana', 'history', 'evento-invalido'), {
        type: 'tipo_inventado',
        title: 'Evento invalido',
        description: 'No deberia permitirse.',
        competencyId: null,
        competencyName: '',
      }),
    );
  });
});

describe('gemelo digital: perfil de cuenta', () => {
  it('permite a la persona duena leer y actualizar su perfil', async () => {
    const ana = asUser(environment, 'ana');
    await assertSucceeds(
      setDoc(doc(ana, 'users', 'ana'), {
        displayName: 'Ana Torres',
        jobTitle: 'Tecnica de RR. HH.',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(ana, 'users', 'ana')));
  });

  it('impide que otra persona lea el perfil', async () => {
    const ana = asUser(environment, 'ana');
    await setDoc(doc(ana, 'users', 'ana'), {
      displayName: 'Ana Torres',
      jobTitle: 'Tecnica de RR. HH.',
    });

    const luis = asUser(environment, 'luis');
    await assertFails(getDoc(doc(luis, 'users', 'ana')));
  });

  it('impide que otra persona escriba en el perfil ajeno', async () => {
    const luis = asUser(environment, 'luis');
    await assertFails(
      setDoc(doc(luis, 'users', 'ana'), {
        displayName: 'Nombre falseado',
        jobTitle: 'Puesto falseado',
      }),
    );
  });
});

describe('denegacion por defecto', () => {
  it('no permite crear colecciones no contempladas', async () => {
    const ana = asUser(environment, 'ana');
    await assertFails(setDoc(doc(ana, 'coleccion_desconocida', 'x'), { valor: 1 }));
    await assertFails(setDoc(doc(ana, 'digitalTwins', 'ana', 'inventario', 'x'), { valor: 1 }));
  });

  it('no permite listar documentos ajenos', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedCompetency(ana, 'ana');

    const luis = asUser(environment, 'luis');
    await assertFails(
      getDocs(collection(luis, 'digitalTwins', 'ana', 'competencies')),
    );
    await assertSucceeds(readCollection(ana, 'digitalTwins/ana/competencies'));
  });

  it('permite a la persona duena listar sus propias competencias', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await seedCompetency(ana, 'ana');
    const snapshot = await getDocs(collection(ana, 'digitalTwins', 'ana', 'competencies'));
    expect(snapshot.docs).toHaveLength(1);
  });
});

describe('consultas con filtro', () => {
  it('solo devuelve los permisos propios cuando se filtra por miembro', async () => {
    const ana = asUser(environment, 'ana');
    await seedTwin(ana, 'ana');
    await setDoc(doc(ana, 'digitalTwins', 'ana', 'sharing', 'luis'), {
      memberUid: 'luis',
      twinId: 'ana',
      orgId: 'org-1',
      orgName: 'Equipo de Seleccion',
      scope: 'full',
      grantedAt: serverTimestamp(),
      revokedAt: null,
    });

    const luis = asUser(environment, 'luis');
    const snapshot = await getDocs(
      query(collectionGroup(luis, 'sharing'), where('memberUid', '==', 'luis')),
    );
    expect(snapshot.docs).toHaveLength(1);
  });
});
