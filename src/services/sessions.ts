import type {
  IsoDate,
  PersonalRecord,
  SessionPlanItem,
  TrackingType,
  WorkoutSession,
  WorkoutSet,
} from "@/types/domain";
import { setEntrySchema, type SetEntryInput } from "@/lib/validation/schemas";
import { detectRecords, sessionElapsedSec, totalVolume, type RecordCandidate } from "@/lib/domain/training";
import { addDays } from "@/lib/domain/dates";
import { DataError } from "./data/driver";
import type { ServiceContext } from "./context";
import { createWorkoutService } from "./workouts";
import { newId, nowIso } from "./ids";

export interface SessionSummary {
  session: WorkoutSession;
  records: RecordCandidate[];
  exercisesDone: number;
}

export interface ExerciseHistoryEntry {
  session: Pick<WorkoutSession, "id" | "workoutName" | "startedAt">;
  sets: WorkoutSet[];
  volumeKg: number;
  bestWeightKg: number | null;
}

const ACTIVE: WorkoutSession["status"][] = ["in_progress", "paused"];

export function createSessionService(ctx: ServiceContext) {
  const { driver, userId } = ctx;
  const workouts = createWorkoutService(ctx);

  async function getActiveSession(): Promise<WorkoutSession | null> {
    const sessions = await driver.list("workout_sessions", {
      in: { field: "status", values: ACTIVE },
      orderBy: { field: "startedAt", direction: "desc" },
      limit: 1,
    });
    return sessions[0] ?? null;
  }

  async function getSession(id: string): Promise<WorkoutSession | null> {
    return driver.get("workout_sessions", id);
  }

  async function listSets(sessionId: string): Promise<WorkoutSet[]> {
    const sets = await driver.list("workout_sets", { where: { sessionId } });
    return sets.sort((a, b) => a.planIndex - b.planIndex || a.setNumber - b.setNumber);
  }

  /** Séances terminées sur une période (dates locales incluses), plus récentes d'abord. */
  async function listCompletedSessions(range?: { from?: IsoDate; to?: IsoDate }): Promise<WorkoutSession[]> {
    const sessions = await driver.list("workout_sessions", {
      where: { status: "completed" },
      range: range
        ? {
            field: "startedAt",
            gte: range.from ? new Date(`${range.from}T00:00:00`).toISOString() : undefined,
            lte: range.to ? new Date(`${addDays(range.to, 1)}T00:00:00`).toISOString() : undefined,
          }
        : undefined,
      orderBy: { field: "startedAt", direction: "desc" },
    });
    return sessions;
  }

  /** Séries validées d'un exercice, groupées par séance (plus récentes d'abord). */
  async function exerciseHistory(exerciseId: string, limit = 20): Promise<ExerciseHistoryEntry[]> {
    const sets = (await driver.list("workout_sets", { where: { exerciseId } })).filter((s) => s.completed);
    const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
    if (!sessionIds.length) return [];
    const sessions = (
      await driver.list("workout_sessions", { in: { field: "id", values: sessionIds } })
    ).filter((s) => s.status === "completed");
    return sessions
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, limit)
      .map((session) => {
        const own = sets
          .filter((s) => s.sessionId === session.id)
          .sort((a, b) => a.setNumber - b.setNumber);
        const weights = own.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
        return {
          session: { id: session.id, workoutName: session.workoutName, startedAt: session.startedAt },
          sets: own,
          volumeKg: totalVolume(own),
          bestWeightKg: weights.length ? Math.max(...weights) : null,
        };
      });
  }

  /** Dernières séries validées par exercice, pour la colonne « Précédent ». */
  async function previousPerformance(exerciseIds: string[]): Promise<Map<string, WorkoutSet[]>> {
    const out = new Map<string, WorkoutSet[]>();
    await Promise.all(
      [...new Set(exerciseIds)].map(async (id) => {
        const [last] = await exerciseHistory(id, 1);
        if (last) out.set(id, last.sets);
      }),
    );
    return out;
  }

  /**
   * Démarre une séance à partir d'un entraînement. Le plan est figé et toutes
   * les séries prévues sont créées immédiatement, pré-remplies avec la dernière
   * performance : chaque saisie est persistée, rien n'est perdu en cas de pause.
   */
  async function startSession(workoutId: string): Promise<WorkoutSession> {
    const active = await getActiveSession();
    if (active) throw new DataError("Une séance est déjà en cours. Terminez-la ou abandonnez-la d'abord.");

    const workout = await workouts.getWorkout(workoutId);
    if (!workout) throw new DataError("Entraînement introuvable.");
    if (!workout.exercises.length) throw new DataError("Cet entraînement ne contient aucun exercice.");

    const plan: SessionPlanItem[] = workout.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exercise.name,
      trackingType: e.exercise.trackingType,
      sets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      durationMinSec: e.durationMinSec,
      durationMaxSec: e.durationMaxSec,
      restSec: e.restSec,
    }));

    const session: WorkoutSession = {
      id: newId(),
      userId,
      workoutId,
      workoutName: workout.name,
      plan,
      status: "in_progress",
      startedAt: nowIso(),
      endedAt: null,
      pausedAt: null,
      pausedMs: 0,
      currentIndex: 0,
      restEndsAt: null,
      notes: "",
      durationSec: null,
      totalVolumeKg: null,
      totalSets: null,
    };

    const previous = await previousPerformance(plan.map((p) => p.exerciseId));
    const targets = new Map(workout.exercises.map((e) => [e.exerciseId, e.targetWeightKg]));
    const sets: WorkoutSet[] = plan.flatMap((item, planIndex) =>
      Array.from({ length: item.sets }, (_, i) => {
        const prev = previous.get(item.exerciseId)?.[i] ?? previous.get(item.exerciseId)?.at(-1);
        return {
          id: newId(),
          userId,
          sessionId: session.id,
          exerciseId: item.exerciseId,
          planIndex,
          setNumber: i + 1,
          weightKg: item.trackingType === "weight_reps" ? (prev?.weightKg ?? targets.get(item.exerciseId) ?? null) : null,
          reps: item.trackingType === "duration" ? null : (prev?.reps ?? item.repsMax ?? item.repsMin),
          durationSec: item.trackingType === "duration" ? (prev?.durationSec ?? item.durationMinSec) : null,
          rpe: null,
          completed: false,
          completedAt: null,
        };
      }),
    );

    await driver.upsert("workout_sessions", session);
    await driver.upsert("workout_sets", sets);
    return session;
  }

  async function requireSession(id: string): Promise<WorkoutSession> {
    const session = await driver.get("workout_sessions", id);
    if (!session) throw new DataError("Séance introuvable.");
    return session;
  }

  async function patchSession(id: string, patch: Partial<WorkoutSession>): Promise<WorkoutSession> {
    const next = { ...(await requireSession(id)), ...patch };
    await driver.upsert("workout_sessions", next);
    return next;
  }

  async function updateSet(setId: string, entry: Partial<SetEntryInput> & { completed?: boolean }): Promise<WorkoutSet> {
    const set = await driver.get("workout_sets", setId);
    if (!set) throw new DataError("Série introuvable.");
    const values = setEntrySchema.partial().parse({
      weightKg: entry.weightKg,
      reps: entry.reps,
      durationSec: entry.durationSec,
      rpe: entry.rpe,
    });
    const next: WorkoutSet = { ...set };
    if (values.weightKg !== undefined) next.weightKg = values.weightKg;
    if (values.reps !== undefined) next.reps = values.reps;
    if (values.durationSec !== undefined) next.durationSec = values.durationSec;
    if (values.rpe !== undefined) next.rpe = values.rpe;
    if (entry.completed !== undefined) {
      next.completed = entry.completed;
      next.completedAt = entry.completed ? nowIso() : null;
    }
    await driver.upsert("workout_sets", next);

    // Validation : la charge / durée réalisée pré-remplit les séries suivantes encore vides.
    if (entry.completed && !set.completed) {
      const following = (await listSets(set.sessionId)).filter(
        (x) => x.planIndex === set.planIndex && x.setNumber > set.setNumber && !x.completed,
      );
      const filled = following
        .filter((x) => (x.weightKg == null && next.weightKg != null) || (x.durationSec == null && next.durationSec != null))
        .map((x) => ({
          ...x,
          weightKg: x.weightKg ?? next.weightKg,
          durationSec: x.durationSec ?? next.durationSec,
        }));
      await driver.upsert("workout_sets", filled);
    }
    return next;
  }

  async function addSet(sessionId: string, planIndex: number): Promise<WorkoutSet> {
    const session = await requireSession(sessionId);
    const item = session.plan[planIndex];
    if (!item) throw new DataError("Exercice introuvable dans la séance.");
    const existing = (await listSets(sessionId)).filter((s) => s.planIndex === planIndex);
    const last = existing.at(-1);
    const set: WorkoutSet = {
      id: newId(),
      userId,
      sessionId,
      exerciseId: item.exerciseId,
      planIndex,
      setNumber: (last?.setNumber ?? 0) + 1,
      weightKg: last?.weightKg ?? null,
      reps: last?.reps ?? item.repsMax ?? item.repsMin,
      durationSec: last?.durationSec ?? item.durationMinSec,
      rpe: null,
      completed: false,
      completedAt: null,
    };
    await driver.upsert("workout_sets", set);
    return set;
  }

  async function removeSet(setId: string): Promise<void> {
    const set = await driver.get("workout_sets", setId);
    if (!set) return;
    await driver.remove("workout_sets", setId);
    const siblings = (await listSets(set.sessionId)).filter((s) => s.planIndex === set.planIndex);
    await driver.upsert(
      "workout_sets",
      siblings.map((s, i) => ({ ...s, setNumber: i + 1 })),
    );
  }

  /** Remplace l'exercice d'une position de la séance (séries non validées uniquement). */
  async function replaceExercise(sessionId: string, planIndex: number, exerciseId: string, exerciseName: string, trackingType: TrackingType) {
    const session = await requireSession(sessionId);
    const item = session.plan[planIndex];
    if (!item) throw new DataError("Exercice introuvable dans la séance.");
    const sets = (await listSets(sessionId)).filter((s) => s.planIndex === planIndex);
    if (sets.some((s) => s.completed)) {
      throw new DataError("Des séries sont déjà validées pour cet exercice : remplacement impossible.");
    }
    const plan = session.plan.map((p, i) => (i === planIndex ? { ...p, exerciseId, exerciseName, trackingType } : p));
    await driver.upsert(
      "workout_sets",
      sets.map((s) => ({
        ...s,
        exerciseId,
        weightKg: trackingType === "weight_reps" ? s.weightKg : null,
        reps: trackingType === "duration" ? null : s.reps,
        durationSec: trackingType === "duration" ? (s.durationSec ?? item.durationMinSec ?? 30) : null,
      })),
    );
    return patchSession(sessionId, { plan });
  }

  async function setCurrentIndex(sessionId: string, index: number) {
    const session = await requireSession(sessionId);
    const bounded = Math.max(0, Math.min(session.plan.length - 1, index));
    return patchSession(sessionId, { currentIndex: bounded });
  }

  async function startRest(sessionId: string, seconds: number) {
    return patchSession(sessionId, { restEndsAt: new Date(Date.now() + seconds * 1000).toISOString() });
  }

  async function clearRest(sessionId: string) {
    return patchSession(sessionId, { restEndsAt: null });
  }

  async function pauseSession(sessionId: string) {
    const session = await requireSession(sessionId);
    if (session.status !== "in_progress") return session;
    return patchSession(sessionId, { status: "paused", pausedAt: nowIso(), restEndsAt: null });
  }

  async function resumeSession(sessionId: string) {
    const session = await requireSession(sessionId);
    if (session.status !== "paused" || !session.pausedAt) return session;
    const pausedFor = Date.now() - new Date(session.pausedAt).getTime();
    return patchSession(sessionId, {
      status: "in_progress",
      pausedAt: null,
      pausedMs: session.pausedMs + Math.max(0, pausedFor),
    });
  }

  /** Clôture : agrégats figés et détection des records personnels. */
  async function finishSession(sessionId: string): Promise<SessionSummary> {
    let session = await requireSession(sessionId);
    if (session.status === "completed") throw new DataError("Séance déjà terminée.");
    if (session.status === "paused") session = await resumeSession(sessionId);

    const sets = await listSets(sessionId);
    const done = sets.filter((s) => s.completed);
    if (!done.length) throw new DataError("Validez au moins une série avant de terminer la séance.");

    const endedAt = nowIso();
    const tracking: Record<string, TrackingType> = Object.fromEntries(
      session.plan.map((p) => [p.exerciseId, p.trackingType]),
    );
    const existing = await driver.list("personal_records", {
      in: { field: "exerciseId", values: Object.keys(tracking) },
    });
    const records = detectRecords(done, tracking, existing);
    const recordRows: PersonalRecord[] = records.map((r) => ({
      id: newId(),
      userId,
      exerciseId: r.exerciseId,
      type: r.type,
      value: r.value,
      weightKg: r.weightKg,
      reps: r.reps,
      sessionId,
      setId: r.setId,
      achievedAt: endedAt,
    }));

    const completed: WorkoutSession = {
      ...session,
      status: "completed",
      endedAt,
      restEndsAt: null,
      pausedAt: null,
      durationSec: sessionElapsedSec({ ...session, endedAt }),
      totalVolumeKg: totalVolume(done),
      totalSets: done.length,
    };
    await driver.upsert("workout_sessions", completed);
    await driver.upsert("personal_records", recordRows);

    return {
      session: completed,
      records,
      exercisesDone: new Set(done.map((s) => s.planIndex)).size,
    };
  }

  /** Abandon : la séance et ses séries sont supprimées (aucune donnée partielle conservée). */
  async function discardSession(sessionId: string): Promise<void> {
    const sets = await driver.list("workout_sets", { where: { sessionId } });
    await driver.remove("workout_sets", sets.map((s) => s.id));
    await driver.remove("workout_sessions", sessionId);
  }

  /** Supprime une séance terminée et recalcule les records des exercices concernés. */
  async function deleteSession(sessionId: string): Promise<void> {
    const session = await requireSession(sessionId);
    const exerciseIds = [...new Set(session.plan.map((p) => p.exerciseId))];
    const records = await driver.list("personal_records", { where: { sessionId } });
    await driver.remove("personal_records", records.map((r) => r.id));
    await discardSession(sessionId);
    await rebuildRecords(exerciseIds);
  }

  /** Reconstruit l'historique des records d'exercices à partir des séances terminées. */
  async function rebuildRecords(exerciseIds: string[]): Promise<void> {
    for (const exerciseId of exerciseIds) {
      const old = await driver.list("personal_records", { where: { exerciseId } });
      await driver.remove("personal_records", old.map((r) => r.id));
      const history = [...(await exerciseHistory(exerciseId, Number.MAX_SAFE_INTEGER))].reverse();
      const accumulated: PersonalRecord[] = [];
      for (const entry of history) {
        const session = await driver.get("workout_sessions", entry.session.id);
        if (!session) continue;
        const tracking = session.plan.find((p) => p.exerciseId === exerciseId)?.trackingType;
        if (!tracking) continue;
        for (const r of detectRecords(entry.sets, { [exerciseId]: tracking }, accumulated)) {
          accumulated.push({
            id: newId(),
            userId,
            exerciseId,
            type: r.type,
            value: r.value,
            weightKg: r.weightKg,
            reps: r.reps,
            sessionId: session.id,
            setId: r.setId,
            achievedAt: session.endedAt ?? session.startedAt,
          });
        }
      }
      await driver.upsert("personal_records", accumulated);
    }
  }

  /** Séries validées d'un ensemble de séances (statistiques). */
  async function completedSetsFor(sessionIds: string[]): Promise<WorkoutSet[]> {
    if (!sessionIds.length) return [];
    const sets = await driver.list("workout_sets", { in: { field: "sessionId", values: sessionIds } });
    return sets.filter((s) => s.completed);
  }

  async function listRecords(exerciseId?: string): Promise<PersonalRecord[]> {
    return driver.list("personal_records", {
      where: exerciseId ? { exerciseId } : undefined,
      orderBy: { field: "achievedAt", direction: "desc" },
    });
  }

  return {
    getActiveSession,
    getSession,
    listSets,
    listCompletedSessions,
    exerciseHistory,
    previousPerformance,
    startSession,
    updateSet,
    addSet,
    removeSet,
    replaceExercise,
    setCurrentIndex,
    startRest,
    clearRest,
    pauseSession,
    resumeSession,
    finishSession,
    discardSession,
    deleteSession,
    listRecords,
    completedSetsFor,
  };
}
