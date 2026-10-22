/**
 * Contexto de datos del gemelo digital.
 *
 * Centraliza las suscripciones en vivo a Firestore (gemelo digital,
 * competencias, objetivos e historial) y expone las acciones de escritura.
 * Los componentes de la interfaz no acceden a Firestore directamente.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  addHistoryEvent,
  deleteHistoryEvent,
  subscribeHistory,
  type HistoryInput,
} from '@/data/history';
import {
  deleteCompetency,
  saveCompetency,
  subscribeCompetencies,
  type CompetencyInput,
} from '@/data/competencies';
import { deleteGoal, saveGoal as saveGoalDocument, subscribeGoals, type GoalInput } from '@/data/goals';
import { saveTwin, subscribeTwin } from '@/data/twins';
import { createUserProfile, subscribeUserProfile, updateUserProfile } from '@/data/users';
import { createId } from '@/data/shared';
import type {
  Competency,
  DigitalTwin,
  Goal,
  HistoryEvent,
  UserProfile,
} from '@/domain/types';

export interface TwinContextValue {
  loading: boolean;
  error: string | null;
  twin: DigitalTwin | null;
  profile: UserProfile | null;
  competencies: Competency[];
  goals: Goal[];
  history: HistoryEvent[];
  saveProfile: (data: { displayName: string; jobTitle: string }) => Promise<void>;
  saveTwinData: (data: { headline: string; summary: string }) => Promise<void>;
  createCompetency: (input: CompetencyInput) => Promise<void>;
  updateCompetency: (id: string, input: CompetencyInput) => Promise<void>;
  removeCompetency: (id: string) => Promise<void>;
  createGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (id: string, input: GoalInput) => Promise<void>;
  saveGoal: (id: string, input: GoalInput) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  recordEvent: (input: HistoryInput) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  ensureProfile: () => Promise<void>;
}

const TwinContext = createContext<TwinContextValue | null>(null);

export const TwinProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [twin, setTwin] = useState<DigitalTwin | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);

  const handleError = useCallback((err: Error) => {
    setError(err.message || 'No se han podido cargar los datos del perfil.');
  }, []);

  useEffect(() => {
    if (!uid) {
      setTwin(null);
      setProfile(null);
      setCompetencies([]);
      setGoals([]);
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const reportError = (err: Error) => handleError(err);

    const unsubscribers = [
      subscribeTwin(uid, setTwin, reportError),
      subscribeUserProfile(uid, setProfile, reportError),
      subscribeCompetencies(uid, setCompetencies, reportError),
      subscribeGoals(uid, setGoals, reportError),
      subscribeHistory(uid, setHistory, reportError),
    ];

    // Los datos viajan por red: se deja de mostrar el estado de carga en
    // cuanto Firestore responde la primera vez (o tras un breve margen).
    const timer = window.setTimeout(() => setLoading(false), 600);

    return () => {
      window.clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid, handleError]);

  const saveProfile = useCallback(
    async (data: { displayName: string; jobTitle: string }) => {
      if (!uid) return;
      setError(null);
      try {
        await updateUserProfile(uid, data);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const saveTwinData = useCallback(
    async (data: { headline: string; summary: string }) => {
      if (!uid) return;
      setError(null);
      try {
        await saveTwin(uid, data);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const createCompetency = useCallback(
    async (input: CompetencyInput) => {
      if (!uid) return;
      setError(null);
      try {
        await saveCompetency(uid, input, createId());
        await addHistoryEvent(
          uid,
          {
            type: 'competency_added',
            title: `Nueva competencia: ${input.name}`,
            description: input.description,
            competencyId: null,
            competencyName: input.name,
            fromLevel: null,
            toLevel: input.level,
          },
          createId(),
        );
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const updateCompetency = useCallback(
    async (id: string, input: CompetencyInput) => {
      if (!uid) return;
      setError(null);
      try {
        const previous = competencies.find((competency) => competency.id === id);
        await saveCompetency(uid, input, id);
        if (previous && previous.level !== input.level) {
          await addHistoryEvent(
            uid,
            {
              type: 'level_updated',
              title: `${input.name}: nivel ${previous.level} a ${input.level}`,
              description: input.description,
              competencyId: id,
              competencyName: input.name,
              fromLevel: previous.level,
              toLevel: input.level,
            },
            createId(),
          );
        }
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, competencies, handleError],
  );

  const removeCompetency = useCallback(
    async (id: string) => {
      if (!uid) return;
      setError(null);
      try {
        await deleteCompetency(uid, id);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const createGoal = useCallback(
    async (input: GoalInput) => {
      if (!uid) return;
      setError(null);
      try {
        await saveGoalDocument(uid, input, createId());
        await addHistoryEvent(
          uid,
          {
            type: 'goal_created',
            title: `Nuevo objetivo: ${input.title}`,
            description: input.description,
            competencyId: input.competencyId,
            competencyName: input.competencyName,
            fromLevel: input.currentLevel,
            toLevel: input.targetLevel,
          },
          createId(),
        );
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const updateGoal = useCallback(
    async (id: string, input: GoalInput) => {
      if (!uid) return;
      setError(null);
      try {
        const previous = goals.find((goal) => goal.id === id);
        await saveGoalDocument(uid, input, id);
        if (previous && previous.status !== 'completed' && input.status === 'completed') {
          await addHistoryEvent(
            uid,
            {
              type: 'goal_completed',
              title: `Objetivo completado: ${input.title}`,
              description: input.description,
              competencyId: input.competencyId,
              competencyName: input.competencyName,
              fromLevel: input.currentLevel,
              toLevel: input.targetLevel,
            },
            createId(),
          );
        }
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, goals, handleError],
  );

  const saveGoal = useCallback(
    async (id: string, input: GoalInput) => {
      if (!uid) return;
      setError(null);
      try {
        await saveGoalDocument(uid, input, id);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const removeGoal = useCallback(
    async (id: string) => {
      if (!uid) return;
      setError(null);
      try {
        await deleteGoal(uid, id);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const recordEvent = useCallback(
    async (input: HistoryInput) => {
      if (!uid) return;
      setError(null);
      try {
        await addHistoryEvent(uid, input, createId());
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const removeEvent = useCallback(
    async (id: string) => {
      if (!uid) return;
      setError(null);
      try {
        await deleteHistoryEvent(uid, id);
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    },
    [uid, handleError],
  );

  const ensureProfile = useCallback(async () => {
    if (!uid) return;
    try {
      await createUserProfile(uid, {
        displayName: user?.displayName ?? '',
        jobTitle: '',
      });
    } catch (err) {
      handleError(err as Error);
    }
  }, [uid, user, handleError]);

  const value = useMemo<TwinContextValue>(
    () => ({
      loading,
      error,
      twin,
      profile,
      competencies,
      goals,
      history,
      saveProfile,
      saveTwinData,
      createCompetency,
      updateCompetency,
      removeCompetency,
      createGoal,
      updateGoal,
      saveGoal,
      removeGoal,
      recordEvent,
      removeEvent,
      ensureProfile,
    }),
    [
      loading,
      error,
      twin,
      profile,
      competencies,
      goals,
      history,
      saveProfile,
      saveTwinData,
      createCompetency,
      updateCompetency,
      removeCompetency,
      createGoal,
      updateGoal,
      saveGoal,
      removeGoal,
      recordEvent,
      removeEvent,
      ensureProfile,
    ],
  );

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
};

/** Acceso al contexto de datos del gemelo digital. */
export const useTwin = (): TwinContextValue => {
  const context = useContext(TwinContext);
  if (!context) {
    throw new Error('useTwin debe usarse dentro de TwinProvider');
  }
  return context;
};
