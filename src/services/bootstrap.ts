import type { Profile, Workout, WorkoutExercise, WorkoutProgram } from "@/types/domain";
import { catalogRows } from "@/data/seed/catalog-rows";
import { PROGRAM_SEED, WORKOUT_SEEDS } from "@/data/seed/programs";
import { DEFAULT_NUTRITION_GOAL, DEFAULT_PREFERENCES, DEMO_PROFILE } from "@/data/seed/profile";
import { startOfWeek, toIsoDate } from "@/lib/domain/dates";
import type { ServiceContext } from "./context";
import { newId, nowIso } from "./ids";

/**
 * Catalogue en mode démo : (ré)écrit à chaque démarrage — quelques dizaines
 * de lignes, toujours alignées sur les seeds. En mode Supabase, le catalogue
 * est fourni par la migration SQL.
 */
export async function ensureLocalCatalog({ driver }: ServiceContext): Promise<void> {
  const rows = catalogRows();
  await driver.upsert("muscle_groups", rows.muscle_groups);
  await driver.upsert("exercises", rows.exercises);
  await driver.upsert("exercise_muscles", rows.exercise_muscles);
}

/**
 * Premier lancement d'un utilisateur : profil, programme 12 semaines avec
 * Full Body A/B/C, objectifs nutritionnels. Aucune séance, mesure ou repas
 * n'est fabriqué : ces données ne viennent que des saisies réelles.
 * Idempotent (ne fait rien si le profil existe).
 */
export async function ensureUserData(
  { driver, userId }: ServiceContext,
  overrides: Partial<Pick<Profile, "displayName">> = {},
): Promise<{ created: boolean }> {
  if (await driver.get("profiles", userId)) return { created: false };

  const now = nowIso();
  const today = toIsoDate();

  const program: WorkoutProgram = {
    id: newId(),
    userId,
    ...PROGRAM_SEED,
    startDate: startOfWeek(today),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const workouts: Workout[] = [];
  const items: WorkoutExercise[] = [];
  WORKOUT_SEEDS.forEach((seed, position) => {
    const workout: Workout = {
      id: newId(),
      userId,
      programId: program.id,
      name: seed.name,
      focus: seed.focus,
      position,
      isCustom: false,
      createdAt: now,
      updatedAt: now,
    };
    workouts.push(workout);
    seed.exercises.forEach((e, i) =>
      items.push({
        id: newId(),
        userId,
        workoutId: workout.id,
        exerciseId: e.exerciseId,
        position: i,
        sets: e.sets,
        repsMin: e.repsMin ?? null,
        repsMax: e.repsMax ?? null,
        durationMinSec: e.durationMinSec ?? null,
        durationMaxSec: e.durationMaxSec ?? null,
        restSec: e.restSec,
        targetWeightKg: null,
        notes: "",
      }),
    );
  });

  const profile: Profile = {
    id: userId,
    ...DEMO_PROFILE,
    ...overrides,
    preferences: { ...DEFAULT_PREFERENCES },
    createdAt: now,
    updatedAt: now,
  };

  // Le profil en dernier : sa présence marque l'initialisation comme complète.
  await driver.upsert("workout_programs", program);
  await driver.upsert("workouts", workouts);
  await driver.upsert("workout_exercises", items);
  await driver.upsert("nutrition_goals", {
    id: newId(),
    userId,
    effectiveFrom: program.startDate,
    ...DEFAULT_NUTRITION_GOAL,
    createdAt: now,
  });
  await driver.upsert("profiles", profile);
  return { created: true };
}
