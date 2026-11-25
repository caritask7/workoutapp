import type { Workout, WorkoutExercise, WorkoutProgram, WorkoutWithExercises } from "@/types/domain";
import { workoutSchema, type WorkoutInput } from "@/lib/validation/schemas";
import { DataError } from "./data/driver";
import type { ServiceContext } from "./context";
import { createCatalogService } from "./catalog";
import { newId, nowIso } from "./ids";

export function createWorkoutService(ctx: ServiceContext) {
  const { driver, userId } = ctx;
  const catalog = createCatalogService(ctx);

  async function getActiveProgram(): Promise<WorkoutProgram | null> {
    const programs = await driver.list("workout_programs", { where: { isActive: true } });
    return programs[0] ?? null;
  }

  async function updateProgram(id: string, patch: Partial<Pick<WorkoutProgram, "name" | "description" | "startDate" | "durationWeeks" | "sessionsPerWeek">>) {
    const program = await driver.get("workout_programs", id);
    if (!program) throw new DataError("Programme introuvable.");
    const next = { ...program, ...patch, updatedAt: nowIso() };
    await driver.upsert("workout_programs", next);
    return next;
  }

  async function hydrate(workouts: Workout[]): Promise<WorkoutWithExercises[]> {
    if (!workouts.length) return [];
    const items = await driver.list("workout_exercises", {
      in: { field: "workoutId", values: workouts.map((w) => w.id) },
      orderBy: { field: "position" },
    });
    const exercises = await catalog.getExercisesByIds(items.map((i) => i.exerciseId));
    return workouts.map((w) => ({
      ...w,
      exercises: items
        .filter((i) => i.workoutId === w.id)
        .flatMap((i) => {
          const exercise = exercises.get(i.exerciseId);
          return exercise ? [{ ...i, exercise }] : [];
        }),
    }));
  }

  /** Entraînements du programme actif (rotation) puis entraînements personnalisés. */
  async function listWorkouts(): Promise<WorkoutWithExercises[]> {
    const workouts = await driver.list("workouts", { orderBy: { field: "position" } });
    const sorted = [...workouts].sort(
      (a, b) => Number(a.isCustom) - Number(b.isCustom) || a.position - b.position || a.name.localeCompare(b.name),
    );
    return hydrate(sorted);
  }

  async function getWorkout(id: string): Promise<WorkoutWithExercises | null> {
    const workout = await driver.get("workouts", id);
    if (!workout) return null;
    const [hydrated] = await hydrate([workout]);
    return hydrated ?? null;
  }

  /** Crée (sans `id`) ou met à jour un entraînement et remplace sa liste d'exercices. */
  async function saveWorkout(input: WorkoutInput, id?: string): Promise<WorkoutWithExercises> {
    const data = workoutSchema.parse(input);
    const now = nowIso();
    let workout: Workout;

    if (id) {
      const existing = await driver.get("workouts", id);
      if (!existing) throw new DataError("Entraînement introuvable.");
      workout = { ...existing, name: data.name, focus: data.focus, updatedAt: now };
    } else {
      const all = await driver.list("workouts");
      workout = {
        id: newId(),
        userId,
        programId: null,
        name: data.name,
        focus: data.focus,
        position: all.reduce((max, w) => Math.max(max, w.position), -1) + 1,
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    const exerciseMap = await catalog.getExercisesByIds(data.exercises.map((e) => e.exerciseId));
    const missing = data.exercises.find((e) => !exerciseMap.has(e.exerciseId));
    if (missing) throw new DataError("Un des exercices sélectionnés n'existe plus.");

    const items: WorkoutExercise[] = data.exercises.map((e, position) => ({
      id: newId(),
      userId,
      workoutId: workout.id,
      exerciseId: e.exerciseId,
      position,
      sets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      durationMinSec: e.durationMinSec,
      durationMaxSec: e.durationMaxSec,
      restSec: e.restSec,
      targetWeightKg: e.targetWeightKg,
      notes: e.notes,
    }));

    const previous = id ? await driver.list("workout_exercises", { where: { workoutId: id } }) : [];
    await driver.upsert("workouts", workout);
    await driver.remove("workout_exercises", previous.map((p) => p.id));
    await driver.upsert("workout_exercises", items);

    const saved = await getWorkout(workout.id);
    if (!saved) throw new DataError("Enregistrement de l'entraînement impossible.");
    return saved;
  }

  async function deleteWorkout(id: string): Promise<void> {
    const items = await driver.list("workout_exercises", { where: { workoutId: id } });
    const sessions = await driver.list("workout_sessions", { where: { workoutId: id } });
    // L'historique est conservé : les séances gardent le nom figé de l'entraînement.
    await driver.upsert("workout_sessions", sessions.map((s) => ({ ...s, workoutId: null })));
    await driver.remove("workout_exercises", items.map((i) => i.id));
    await driver.remove("workouts", id);
  }

  async function duplicateWorkout(id: string): Promise<WorkoutWithExercises> {
    const source = await getWorkout(id);
    if (!source) throw new DataError("Entraînement introuvable.");
    return saveWorkout({
      name: `${source.name} (copie)`.slice(0, 60),
      focus: source.focus,
      exercises: source.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        durationMinSec: e.durationMinSec,
        durationMaxSec: e.durationMaxSec,
        restSec: e.restSec,
        targetWeightKg: e.targetWeightKg,
        notes: e.notes,
      })),
    });
  }

  return {
    getActiveProgram,
    updateProgram,
    listWorkouts,
    getWorkout,
    saveWorkout,
    deleteWorkout,
    duplicateWorkout,
  };
}
