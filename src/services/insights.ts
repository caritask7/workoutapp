import type {
  IsoDate,
  PersonalRecord,
  Profile,
  Weekday,
  WorkoutProgram,
  WorkoutSession,
  WorkoutWithExercises,
} from "@/types/domain";
import { addDays, isoDateOf, isoWeekday, startOfWeek, weekDates } from "@/lib/domain/dates";
import { latestValue } from "@/lib/domain/body";
import { programWeek, round } from "@/lib/domain/training";
import type { Services } from ".";

export type DayStatus = "done" | "today" | "planned" | "missed" | "rest" | "extra";

export interface WeekDay {
  date: IsoDate;
  weekday: Weekday;
  status: DayStatus;
  /** Séances terminées ce jour-là. */
  sessions: WorkoutSession[];
  /** Entraînement prévu (rotation) pour les jours d'entraînement à venir. */
  plannedWorkoutId: string | null;
}

export interface ProgramOverview {
  program: WorkoutProgram;
  week: number;
  completedInProgram: number;
  plannedTotal: number;
  percent: number;
}

export interface TrainingOverview {
  today: IsoDate;
  profile: Profile;
  program: ProgramOverview | null;
  /** Entraînements du programme (rotation) puis personnalisés. */
  workouts: WorkoutWithExercises[];
  rotation: WorkoutWithExercises[];
  week: WeekDay[];
  weekCompleted: number;
  weekPlanned: number;
  /** Prochaine séance de la rotation. */
  nextWorkout: WorkoutWithExercises | null;
  trainedToday: boolean;
  activeSession: WorkoutSession | null;
  weekVolumeKg: number;
  previousWeekVolumeKg: number;
  /** Dernière séance terminée de chaque entraînement. */
  lastByWorkout: Record<string, WorkoutSession>;
  /** Séances terminées cette semaine, par entraînement. */
  thisWeekByWorkout: Record<string, WorkoutSession>;
}

/**
 * Vue d'ensemble de l'entraînement (Home + Workouts). Tout est dérivé des
 * séances réellement enregistrées : aucune valeur n'est simulée.
 */
export async function getTrainingOverview(s: Services, today: IsoDate): Promise<TrainingOverview> {
  const monday = startOfWeek(today);
  const [profile, program, workouts, sessions, activeSession] = await Promise.all([
    s.profile.getProfile(),
    s.workouts.getActiveProgram(),
    s.workouts.listWorkouts(),
    s.sessions.listCompletedSessions(),
    s.sessions.getActiveSession(),
  ]);
  if (!profile) throw new Error("Profil introuvable.");

  const rotation = program
    ? workouts.filter((w) => w.programId === program.id && !w.isCustom).sort((a, b) => a.position - b.position)
    : [];
  const rotationIds = new Set(rotation.map((w) => w.id));

  // Rotation : la prochaine séance suit la dernière séance de programme réalisée.
  const programSessions = sessions.filter(
    (x) => x.workoutId && rotationIds.has(x.workoutId) && (!program || isoDateOf(x.startedAt) >= program.startDate),
  );
  const lastProgramSession = programSessions[0];
  const lastIndex = lastProgramSession ? rotation.findIndex((w) => w.id === lastProgramSession.workoutId) : -1;
  const nextIndex = rotation.length ? (lastIndex + 1) % rotation.length : -1;
  const nextWorkout = nextIndex >= 0 ? rotation[nextIndex] : (workouts[0] ?? null);

  const lastByWorkout: Record<string, WorkoutSession> = {};
  for (const x of sessions) if (x.workoutId && !lastByWorkout[x.workoutId]) lastByWorkout[x.workoutId] = x;

  const thisWeek = sessions.filter((x) => isoDateOf(x.startedAt) >= monday);
  const thisWeekByWorkout: Record<string, WorkoutSession> = {};
  for (const x of thisWeek) if (x.workoutId && !thisWeekByWorkout[x.workoutId]) thisWeekByWorkout[x.workoutId] = x;

  const prevMonday = addDays(monday, -7);
  const previousWeek = sessions.filter((x) => {
    const d = isoDateOf(x.startedAt);
    return d >= prevMonday && d < monday;
  });

  // Semaine : statut de chaque jour, et entraînements de la rotation projetés sur les jours à venir.
  const trainingDays = new Set(profile.trainingDays);
  // Avant l'inscription, un jour d'entraînement passé n'est pas « manqué ».
  const joined = isoDateOf(profile.createdAt);
  let projection = nextIndex;
  const trainedToday = thisWeek.some((x) => isoDateOf(x.startedAt) === today);
  const week: WeekDay[] = weekDates(today).map((date) => {
    const weekday = isoWeekday(date);
    const daySessions = thisWeek.filter((x) => isoDateOf(x.startedAt) === date);
    const isTraining = trainingDays.has(weekday);
    let status: DayStatus;
    if (daySessions.length) status = isTraining ? "done" : "extra";
    else if (date === today && isTraining) status = "today";
    else if (date > today && isTraining) status = "planned";
    else if (date < today && isTraining && date >= joined) status = "missed";
    else status = "rest";

    let plannedWorkoutId: string | null = null;
    if ((status === "today" || status === "planned") && rotation.length && projection >= 0) {
      plannedWorkoutId = rotation[projection % rotation.length].id;
      projection++;
    }
    return { date, weekday, status, sessions: daySessions, plannedWorkoutId };
  });

  const programOverview: ProgramOverview | null = program
    ? (() => {
        const plannedTotal = program.durationWeeks * program.sessionsPerWeek;
        const completedInProgram = programSessions.length;
        return {
          program,
          week: programWeek(program.startDate, today, program.durationWeeks),
          completedInProgram,
          plannedTotal,
          percent: Math.min(100, Math.round((completedInProgram / plannedTotal) * 100)),
        };
      })()
    : null;

  const volume = (list: WorkoutSession[]) => round(list.reduce((sum, x) => sum + (x.totalVolumeKg ?? 0), 0), 0);

  return {
    today,
    profile,
    program: programOverview,
    workouts,
    rotation,
    week,
    weekCompleted: thisWeek.length,
    weekPlanned: profile.trainingDays.length,
    nextWorkout,
    trainedToday,
    activeSession,
    weekVolumeKg: volume(thisWeek),
    previousWeekVolumeKg: volume(previousWeek),
    lastByWorkout,
    thisWeekByWorkout,
  };
}

export interface WeightOverview {
  startKg: number | null;
  currentKg: number | null;
  currentDate: string | null;
  /** Variation sur les 30 derniers jours (mesures réelles uniquement). */
  monthDeltaKg: number | null;
  targetMinKg: number | null;
  targetMaxKg: number | null;
}

export async function getWeightOverview(s: Services, today: IsoDate): Promise<WeightOverview> {
  const [profile, measurements] = await Promise.all([s.profile.getProfile(), s.body.listMeasurements()]);
  const latest = latestValue(measurements, "weightKg");
  const monthAgo = addDays(today, -30);
  const withWeight = measurements.filter((m) => m.weightKg !== null).sort((a, b) => (a.date < b.date ? -1 : 1));
  const baseline = [...withWeight].reverse().find((m) => m.date <= monthAgo) ?? withWeight.find((m) => m.date >= monthAgo);
  const monthDeltaKg =
    latest && baseline && baseline.date !== latest.date ? round(latest.value - (baseline.weightKg as number), 1) : null;
  return {
    startKg: profile?.startWeightKg ?? null,
    currentKg: latest?.value ?? null,
    currentDate: latest?.date ?? null,
    monthDeltaKg,
    targetMinKg: profile?.targetWeightMinKg ?? null,
    targetMaxKg: profile?.targetWeightMaxKg ?? null,
  };
}

export interface RecordHighlight {
  record: PersonalRecord;
  exerciseName: string;
  previous: number | null;
}

/** Records les plus récents (charge max), avec le record précédent pour le delta. */
export async function getRecentRecords(s: Services, limit = 3): Promise<RecordHighlight[]> {
  const records = (await s.sessions.listRecords()).filter((r) => r.type === "max_weight");
  const latestByExercise = new Map<string, PersonalRecord>();
  for (const r of records) if (!latestByExercise.has(r.exerciseId)) latestByExercise.set(r.exerciseId, r);
  const top = [...latestByExercise.values()].slice(0, limit);
  const exercises = await s.catalog.getExercisesByIds(top.map((r) => r.exerciseId));
  return top.map((record) => {
    const previous = records.find((r) => r.exerciseId === record.exerciseId && r.achievedAt < record.achievedAt);
    return { record, exerciseName: exercises.get(record.exerciseId)?.name ?? "Exercice", previous: previous?.value ?? null };
  });
}

/** Muscles ciblés par un entraînement (principaux d'abord, sans doublon). */
export function workoutMuscles(workout: WorkoutWithExercises) {
  const primary = new Map<string, number>();
  const secondary = new Map<string, number>();
  for (const e of workout.exercises) {
    for (const m of e.exercise.primaryMuscles) primary.set(m, (primary.get(m) ?? 0) + e.sets);
    for (const m of e.exercise.secondaryMuscles) secondary.set(m, (secondary.get(m) ?? 0) + e.sets);
  }
  return {
    primary: [...primary.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m),
    setsByMuscle: primary,
    secondary: [...secondary.keys()].filter((m) => !primary.has(m)),
  };
}

/** Durée estimée : séries × (temps d'effort ≈ 40 s + repos), arrondie à 5 min. */
export function estimateWorkoutMinutes(workout: WorkoutWithExercises): number {
  const sec = workout.exercises.reduce((sum, e) => sum + e.sets * (40 + e.restSec), 0) + workout.exercises.length * 60;
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

export function totalPlannedSets(workout: WorkoutWithExercises): number {
  return workout.exercises.reduce((sum, e) => sum + e.sets, 0);
}
