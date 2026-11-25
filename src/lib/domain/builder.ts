import type { ExerciseWithMuscles, MuscleId } from "@/types/domain";
import type { WorkoutExerciseInput } from "@/lib/validation/schemas";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import { EXERCISE_SEEDS } from "@/data/seed/exercises";

/** Rang de référence : les mouvements de base du programme passent en premier. */
const SEED_RANK = new Map(EXERCISE_SEEDS.map((e, i) => [e.id, i]));
const rank = (id: string) => SEED_RANK.get(id) ?? Number.MAX_SAFE_INTEGER;

/** Grands groupes : reçoivent plus de séries qu'un petit groupe. */
const LARGE: MuscleId[] = ["chest", "lats", "upper_back", "quads", "glutes", "hamstrings"];

const ISOLATION_PATTERNS = new Set([
  "lateral_raise",
  "elbow_flexion",
  "elbow_extension",
  "leg_curl",
  "calf_raise",
  "core_flexion",
  "core_isometric",
]);

function isCompound(e: ExerciseWithMuscles) {
  return !ISOLATION_PATTERNS.has(e.pattern) && e.primaryMuscles.length + e.secondaryMuscles.length >= 3;
}

/** Cibles par défaut d'un exercice ajouté à une séance. */
export function targetsFor(e: ExerciseWithMuscles, sets: number): WorkoutExerciseInput {
  const duration = e.trackingType === "duration";
  const compound = isCompound(e);
  return {
    exerciseId: e.id,
    sets,
    repsMin: duration ? null : compound ? 8 : 10,
    repsMax: duration ? null : compound ? 12 : 15,
    durationMinSec: duration ? 30 : null,
    durationMaxSec: duration ? 45 : null,
    restSec: e.defaultRestSec,
    targetWeightKg: null,
    notes: "",
  };
}

/**
 * Propose une séance à partir de groupes musculaires (règles déterministes) :
 * un exercice dont le muscle principal correspond, les polyarticulaires en
 * premier, 3 séries pour un grand groupe et 2 pour un petit. Les muscles déjà
 * couverts en principal par un exercice retenu ne sont pas doublés.
 */
export function suggestWorkout(muscles: MuscleId[], catalog: ExerciseWithMuscles[]): WorkoutExerciseInput[] {
  const ordered = [...muscles].sort((a, b) => Number(LARGE.includes(b)) - Number(LARGE.includes(a)));
  const covered = new Set<MuscleId>();
  const chosen: { exercise: ExerciseWithMuscles; muscle: MuscleId }[] = [];

  for (const muscle of ordered) {
    if (covered.has(muscle)) continue;
    const candidates = catalog
      .filter((e) => e.primaryMuscles[0] === muscle && !chosen.some((c) => c.exercise.id === e.id))
      .sort(
        (a, b) =>
          Number(isCompound(b)) - Number(isCompound(a)) ||
          rank(a.id) - rank(b.id) ||
          a.name.localeCompare(b.name),
      );
    const fallback = catalog.find((e) => e.primaryMuscles.includes(muscle) && !chosen.some((c) => c.exercise.id === e.id));
    const pick = candidates[0] ?? fallback;
    if (!pick) continue;
    chosen.push({ exercise: pick, muscle });
    pick.primaryMuscles.forEach((m) => {
      if (muscles.includes(m)) covered.add(m);
    });
  }

  // Polyarticulaires d'abord, isolation ensuite, gainage en fin de séance.
  chosen.sort(
    (a, b) =>
      Number(b.exercise.pattern !== "core_isometric" && b.exercise.pattern !== "core_flexion") -
        Number(a.exercise.pattern !== "core_isometric" && a.exercise.pattern !== "core_flexion") ||
      Number(isCompound(b.exercise)) - Number(isCompound(a.exercise)),
  );
  return chosen.map(({ exercise, muscle }) => targetsFor(exercise, LARGE.includes(muscle) ? 3 : 2));
}

export interface SessionDensity {
  totalSets: number;
  zone: "light" | "target" | "high" | "overload";
  /** Part poussée / tirage en % (séries des exercices de haut du corps). */
  pushPct: number | null;
  pullPct: number | null;
  setsByMuscle: Partial<Record<MuscleId, number>>;
}

/**
 * Repères de volume par séance (indicatifs, issus de la maquette) :
 * < 12 séries léger, 12-22 zone visée, 23-25 élevé, 26+ surcharge.
 */
export function sessionDensity(items: { exerciseId: string; sets: number }[], catalog: Map<string, ExerciseWithMuscles>): SessionDensity {
  let push = 0;
  let pull = 0;
  let total = 0;
  const setsByMuscle: Partial<Record<MuscleId, number>> = {};
  for (const item of items) {
    const e = catalog.get(item.exerciseId);
    total += item.sets;
    if (!e) continue;
    for (const m of e.primaryMuscles) setsByMuscle[m] = (setsByMuscle[m] ?? 0) + item.sets;
    const bias = MUSCLE_BY_ID[e.primaryMuscles[0]]?.bias;
    if (bias === "push") push += item.sets;
    if (bias === "pull") pull += item.sets;
  }
  const upper = push + pull;
  return {
    totalSets: total,
    zone: total < 12 ? "light" : total <= 22 ? "target" : total <= 25 ? "high" : "overload",
    pushPct: upper ? Math.round((push / upper) * 100) : null,
    pullPct: upper ? 100 - Math.round((push / upper) * 100) : null,
    setsByMuscle,
  };
}
