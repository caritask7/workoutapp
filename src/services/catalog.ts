import type { Exercise, ExerciseMuscle, ExerciseWithMuscles, MuscleGroup, MuscleId } from "@/types/domain";
import { customExerciseSchema, type CustomExerciseInput } from "@/lib/validation/schemas";
import { DataError } from "./data/driver";
import type { ServiceContext } from "./context";
import { newId, nowIso } from "./ids";

/** Inférence du schéma d'exécution d'un exercice personnalisé. */
function patternFor(input: CustomExerciseInput): Exercise["pattern"] {
  const main = input.primaryMuscles[0];
  switch (main) {
    case "chest":
      return "horizontal_push";
    case "shoulders":
      return "vertical_push";
    case "triceps":
      return "elbow_extension";
    case "biceps":
    case "forearms":
      return "elbow_flexion";
    case "lats":
      return "vertical_pull";
    case "upper_back":
    case "traps":
      return "horizontal_pull";
    case "abs":
    case "obliques":
      return input.trackingType === "duration" ? "core_isometric" : "core_flexion";
    case "lower_back":
    case "hamstrings":
      return "hinge";
    case "glutes":
      return "hip_thrust";
    case "calves":
      return "calf_raise";
    default:
      return "squat";
  }
}

export function composeExercise(exercise: Exercise, links: ExerciseMuscle[]): ExerciseWithMuscles {
  const own = links.filter((l) => l.exerciseId === exercise.id).sort((a, b) => a.position - b.position);
  return {
    ...exercise,
    primaryMuscles: own.filter((l) => l.role === "primary").map((l) => l.muscleId),
    secondaryMuscles: own.filter((l) => l.role === "secondary").map((l) => l.muscleId),
  };
}

export function createCatalogService({ driver, userId }: ServiceContext) {
  async function listMuscles(): Promise<MuscleGroup[]> {
    return driver.list("muscle_groups");
  }

  async function listExercises(): Promise<ExerciseWithMuscles[]> {
    const [exercises, links] = await Promise.all([
      driver.list("exercises", { orderBy: { field: "name" } }),
      driver.list("exercise_muscles"),
    ]);
    return exercises.map((e) => composeExercise(e, links));
  }

  async function getExercise(id: string): Promise<ExerciseWithMuscles | null> {
    const [exercise, links] = await Promise.all([
      driver.get("exercises", id),
      driver.list("exercise_muscles", { where: { exerciseId: id } }),
    ]);
    return exercise ? composeExercise(exercise, links) : null;
  }

  async function getExercisesByIds(ids: string[]): Promise<Map<string, ExerciseWithMuscles>> {
    if (!ids.length) return new Map();
    const unique = [...new Set(ids)];
    const [exercises, links] = await Promise.all([
      driver.list("exercises", { in: { field: "id", values: unique } }),
      driver.list("exercise_muscles", { in: { field: "exerciseId", values: unique } }),
    ]);
    return new Map(exercises.map((e) => [e.id, composeExercise(e, links)]));
  }

  function linkRows(exerciseId: string, primary: MuscleId[], secondary: MuscleId[]): ExerciseMuscle[] {
    const sec = secondary.filter((m) => !primary.includes(m));
    return [
      ...primary.map((muscleId) => ({ muscleId, role: "primary" as const })),
      ...sec.map((muscleId) => ({ muscleId, role: "secondary" as const })),
    ].map((l, position) => ({ id: newId(), ownerId: userId, exerciseId, ...l, position }));
  }

  async function createCustomExercise(input: CustomExerciseInput): Promise<ExerciseWithMuscles> {
    const data = customExerciseSchema.parse(input);
    const exercise: Exercise = {
      id: newId(),
      ownerId: userId,
      name: data.name,
      equipment: data.equipment,
      trackingType: data.trackingType,
      pattern: patternFor(data),
      description: data.description,
      instructions: data.instructions,
      defaultRestSec: data.defaultRestSec,
      createdAt: nowIso(),
    };
    await driver.upsert("exercises", exercise);
    const links = linkRows(exercise.id, data.primaryMuscles, data.secondaryMuscles);
    await driver.upsert("exercise_muscles", links);
    return composeExercise(exercise, links);
  }

  async function updateCustomExercise(id: string, input: CustomExerciseInput): Promise<ExerciseWithMuscles> {
    const existing = await driver.get("exercises", id);
    if (!existing) throw new DataError("Exercice introuvable.");
    if (existing.ownerId !== userId) throw new DataError("Les exercices du catalogue ne sont pas modifiables.");
    const data = customExerciseSchema.parse(input);
    const exercise: Exercise = {
      ...existing,
      name: data.name,
      equipment: data.equipment,
      trackingType: data.trackingType,
      pattern: patternFor(data),
      description: data.description,
      instructions: data.instructions,
      defaultRestSec: data.defaultRestSec,
    };
    const oldLinks = await driver.list("exercise_muscles", { where: { exerciseId: id } });
    await driver.upsert("exercises", exercise);
    await driver.remove("exercise_muscles", oldLinks.map((l) => l.id));
    const links = linkRows(id, data.primaryMuscles, data.secondaryMuscles);
    await driver.upsert("exercise_muscles", links);
    return composeExercise(exercise, links);
  }

  async function deleteCustomExercise(id: string): Promise<void> {
    const existing = await driver.get("exercises", id);
    if (!existing) return;
    if (existing.ownerId !== userId) throw new DataError("Les exercices du catalogue ne sont pas supprimables.");
    const [usedInWorkouts, usedInSets] = await Promise.all([
      driver.list("workout_exercises", { where: { exerciseId: id }, limit: 1 }),
      driver.list("workout_sets", { where: { exerciseId: id }, limit: 1 }),
    ]);
    if (usedInWorkouts.length || usedInSets.length) {
      throw new DataError("Exercice utilisé dans un entraînement ou un historique : suppression impossible.");
    }
    const links = await driver.list("exercise_muscles", { where: { exerciseId: id } });
    await driver.remove("exercise_muscles", links.map((l) => l.id));
    await driver.remove("exercises", id);
  }

  return {
    listMuscles,
    listExercises,
    getExercise,
    getExercisesByIds,
    createCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
  };
}
