import type { Exercise, ExerciseMuscle, MuscleGroup } from "@/types/domain";
import { EXERCISE_SEEDS } from "./exercises";
import { MUSCLE_GROUPS } from "./muscles";

const CATALOG_CREATED_AT = "2026-01-01T00:00:00.000Z";

/**
 * Lignes du catalogue partagé, identiques en mode démo (IndexedDB) et dans
 * la migration SQL générée (scripts/generate-seed-sql.ts).
 */
export function catalogRows(): {
  muscle_groups: MuscleGroup[];
  exercises: Exercise[];
  exercise_muscles: ExerciseMuscle[];
} {
  const exercises: Exercise[] = EXERCISE_SEEDS.map((s) => ({
    id: s.id,
    ownerId: null,
    name: s.name,
    equipment: s.equipment,
    trackingType: s.trackingType,
    pattern: s.pattern,
    description: s.description,
    instructions: s.instructions,
    defaultRestSec: s.defaultRestSec,
    createdAt: CATALOG_CREATED_AT,
  }));

  const exercise_muscles: ExerciseMuscle[] = EXERCISE_SEEDS.flatMap((s) =>
    [
      ...s.primary.map((m) => ({ muscleId: m, role: "primary" as const })),
      ...s.secondary.filter((m) => !s.primary.includes(m)).map((m) => ({ muscleId: m, role: "secondary" as const })),
    ].map((l, position) => ({ id: `${s.id}:${l.muscleId}`, ownerId: null, exerciseId: s.id, ...l, position })),
  );

  return { muscle_groups: MUSCLE_GROUPS, exercises, exercise_muscles };
}
