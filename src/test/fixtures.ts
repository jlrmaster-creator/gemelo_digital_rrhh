/**
 * Datos de prueba compartidos.
 *
 * Los datos son declarativos y minimos: reproduCEN la forma de los documentos
 * de Firestore sin depender del emulador, de modo que las pruebas unitarias
 * sean rapidas y deterministas.
 */

import { Timestamp } from 'firebase/firestore';
import type {
  Competency,
  DigitalTwin,
  Goal,
  HistoryEvent,
  UserProfile,
} from '@/domain/types';

export const FIXTURE_DATE = Timestamp.fromDate(new Date('2026-03-15T10:00:00.000Z'));

export const fixtureProfile = (): UserProfile => ({
  uid: 'uid-ana',
  displayName: 'Ana Torres',
  jobTitle: 'Tecnica de Recursos Humanos',
  createdAt: FIXTURE_DATE,
  updatedAt: FIXTURE_DATE,
});

export const fixtureTwin = (): DigitalTwin => ({
  userId: 'uid-ana',
  headline: 'Especialista en desarrollo de talento',
  summary: 'Mas de 8 anos acompanando equipos de producto.',
  createdAt: FIXTURE_DATE,
  updatedAt: FIXTURE_DATE,
});

export const fixtureCompetencies = (): Competency[] => [
  {
    id: 'c1',
    name: 'Comunicacion efectiva',
    category: 'Comunicacion',
    level: 4,
    description: 'Facilita reuniones y presentaciones.',
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
  },
  {
    id: 'c2',
    name: 'Analisis de datos',
    category: 'Analisis',
    level: 2,
    description: 'Construye informe basicos de seguimiento.',
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
  },
  {
    id: 'c3',
    name: 'Liderazgo de equipos',
    category: 'Liderazgo',
    level: 3,
    description: 'Coordina un equipo de 6 personas.',
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
  },
];

export const fixtureGoals = (): Goal[] => [
  {
    id: 'g1',
    title: 'Mejorar el analisis de datos',
    description: 'Subir del nivel 2 al nivel 4 en seis meses.',
    competencyId: 'c2',
    competencyName: 'Analisis de datos',
    currentLevel: 2,
    targetLevel: 4,
    targetDate: '2026-09-30',
    status: 'in_progress',
    actions: [
      { id: 'a1', title: 'Completar una formacion corta relacionada', done: true },
      { id: 'a2', title: 'Practicar con datos reales del area', done: false },
    ],
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
  },
  {
    id: 'g2',
    title: 'Certificarse en analisis',
    description: 'Obtener la certificacion profesional del area.',
    competencyId: 'c2',
    competencyName: 'Analisis de datos',
    currentLevel: 2,
    targetLevel: 3,
    targetDate: '2026-12-31',
    status: 'pending',
    actions: [],
    createdAt: FIXTURE_DATE,
    updatedAt: FIXTURE_DATE,
  },
];

export const fixtureHistory = (): HistoryEvent[] => [
  {
    id: 'h1',
    type: 'level_updated',
    title: 'Nivel actualizado: Comunicacion efectiva',
    description: 'Pasa de 3 a 4.',
    competencyId: 'c1',
    competencyName: 'Comunicacion efectiva',
    fromLevel: 3,
    toLevel: 4,
    createdAt: FIXTURE_DATE,
  },
  {
    id: 'h2',
    type: 'goal_created',
    title: 'Nuevo objetivo: Mejorar el analisis de datos',
    description: '',
    competencyId: 'c2',
    competencyName: 'Analisis de datos',
    fromLevel: null,
    toLevel: null,
    createdAt: FIXTURE_DATE,
  },
];
