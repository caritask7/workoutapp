/**
 * Types centralisés du domaine WORKOUT.
 *
 * Conventions :
 * - Les identifiants sont des chaînes (UUID pour les données utilisateur,
 *   slug stable pour le catalogue : "squat", "chest"…).
 * - Les horodatages sont des ISO 8601 (`IsoDateTime`), les dates calendaires
 *   des chaînes `YYYY-MM-DD` (`IsoDate`) en heure locale de l'utilisateur.
 * - Les champs `ownerId` à `null` désignent une entrée du catalogue partagé.
 */

export type Id = string;
export type IsoDate = string;
export type IsoDateTime = string;

/* -------------------------------------------------------------------------- */
/*                                   Muscles                                  */
/* -------------------------------------------------------------------------- */

export const MUSCLE_IDS = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "traps",
  "lats",
  "upper_back",
  "lower_back",
  "glutes",
  "quads",
  "hamstrings",
  "adductors",
  "calves",
] as const;
export type MuscleId = (typeof MUSCLE_IDS)[number];

export type MuscleRegion = "upper" | "core" | "lower";
/** Classement utilisé pour le ratio push / pull du muscle selector. */
export type MovementBias = "push" | "pull" | "legs" | "core";
export type BodyView = "front" | "back";

export interface MuscleGroup {
  id: MuscleId;
  name: string;
  shortName: string;
  region: MuscleRegion;
  bias: MovementBias;
  /** Vues anatomiques sur lesquelles le muscle est visible. */
  views: BodyView[];
}

/* -------------------------------------------------------------------------- */
/*                                  Exercices                                 */
/* -------------------------------------------------------------------------- */

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "other";

/** Ce qui est mesuré pour chaque série. */
export type TrackingType = "weight_reps" | "reps" | "duration";

/** Famille de mouvement : pilote le schéma d'exécution affiché. */
export type MovementPattern =
  | "squat"
  | "hinge"
  | "leg_press"
  | "hip_thrust"
  | "leg_curl"
  | "calf_raise"
  | "horizontal_push"
  | "incline_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "lateral_raise"
  | "elbow_flexion"
  | "elbow_extension"
  | "core_flexion"
  | "core_isometric";

export interface Exercise {
  id: Id;
  ownerId: Id | null;
  name: string;
  equipment: Equipment;
  trackingType: TrackingType;
  pattern: MovementPattern;
  description: string;
  instructions: string[];
  defaultRestSec: number;
  createdAt: IsoDateTime;
}

export type MuscleRole = "primary" | "secondary";

export interface ExerciseMuscle {
  id: Id;
  ownerId: Id | null;
  exerciseId: Id;
  muscleId: MuscleId;
  role: MuscleRole;
  /** Ordre d'importance (0 = muscle principal mis en avant). */
  position: number;
}

/** Exercice enrichi de ses muscles (vue composée par les services). */
export interface ExerciseWithMuscles extends Exercise {
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
}

/* -------------------------------------------------------------------------- */
/*                          Programmes & entraînements                        */
/* -------------------------------------------------------------------------- */

export interface WorkoutProgram {
  id: Id;
  userId: Id;
  name: string;
  description: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  startDate: IsoDate;
  isActive: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Workout {
  id: Id;
  userId: Id;
  /** `null` pour un entraînement personnalisé hors programme. */
  programId: Id | null;
  name: string;
  /** Sous-titre court (ex. « Hypertrophie »). */
  focus: string;
  /** Ordre dans la rotation du programme (0, 1, 2…). */
  position: number;
  isCustom: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface WorkoutExercise {
  id: Id;
  userId: Id;
  workoutId: Id;
  exerciseId: Id;
  position: number;
  sets: number;
  /** Répétitions cibles (trackingType weight_reps / reps). */
  repsMin: number | null;
  repsMax: number | null;
  /** Durée cible en secondes (trackingType duration). */
  durationMinSec: number | null;
  durationMaxSec: number | null;
  restSec: number;
  /** Charge de travail prévue (kg), optionnelle. */
  targetWeightKg: number | null;
  notes: string;
}

export interface WorkoutWithExercises extends Workout {
  exercises: (WorkoutExercise & { exercise: ExerciseWithMuscles })[];
}

/* -------------------------------------------------------------------------- */
/*                                   Séances                                  */
/* -------------------------------------------------------------------------- */

export type SessionStatus = "in_progress" | "paused" | "completed" | "abandoned";

/** Instantané du plan au démarrage (stable même si le modèle est modifié ensuite). */
export interface SessionPlanItem {
  exerciseId: Id;
  exerciseName: string;
  trackingType: TrackingType;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  durationMinSec: number | null;
  durationMaxSec: number | null;
  restSec: number;
}

export interface WorkoutSession {
  id: Id;
  userId: Id;
  workoutId: Id | null;
  workoutName: string;
  plan: SessionPlanItem[];
  status: SessionStatus;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime | null;
  /** Début de la pause en cours, sinon `null`. */
  pausedAt: IsoDateTime | null;
  /** Cumul des pauses terminées, en millisecondes. */
  pausedMs: number;
  currentIndex: number;
  /** Instant de fin du repos en cours (minuteur persistant). */
  restEndsAt: IsoDateTime | null;
  notes: string;
  /** Agrégats figés à la clôture. */
  durationSec: number | null;
  totalVolumeKg: number | null;
  totalSets: number | null;
}

export interface WorkoutSet {
  id: Id;
  userId: Id;
  sessionId: Id;
  exerciseId: Id;
  /** Index de l'exercice dans `plan`. */
  planIndex: number;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  rpe: number | null;
  completed: boolean;
  completedAt: IsoDateTime | null;
}

export type RecordType = "max_weight" | "est_1rm" | "max_reps" | "max_set_volume" | "max_duration";

export interface PersonalRecord {
  id: Id;
  userId: Id;
  exerciseId: Id;
  type: RecordType;
  value: number;
  weightKg: number | null;
  reps: number | null;
  sessionId: Id;
  setId: Id;
  achievedAt: IsoDateTime;
}

/* -------------------------------------------------------------------------- */
/*                              Corps & progression                           */
/* -------------------------------------------------------------------------- */

export interface BodyMeasurement {
  id: Id;
  userId: Id;
  date: IsoDate;
  weightKg: number | null;
  chestCm: number | null;
  armCm: number | null;
  waistCm: number | null;
  thighCm: number | null;
  /** Saisi par l'utilisateur uniquement (aucune estimation). */
  bodyFatPct: number | null;
  notes: string;
  createdAt: IsoDateTime;
}

export interface ProgressPhoto {
  id: Id;
  userId: Id;
  date: IsoDate;
  /** Chemin Supabase Storage ou clé du blob local. */
  storagePath: string;
  weightKg: number | null;
  notes: string;
  createdAt: IsoDateTime;
}

/* -------------------------------------------------------------------------- */
/*                                   Profil                                   */
/* -------------------------------------------------------------------------- */

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type FitnessGoal = "muscle_gain" | "strength" | "fat_loss" | "maintenance";
/** 1 = lundi … 7 = dimanche (ISO 8601). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface UserPreferences {
  defaultRestSec: number;
  restTimerSound: boolean;
  restTimerVibration: boolean;
  autoStartRestTimer: boolean;
  weightIncrementKg: number;
}

export interface Profile {
  id: Id;
  displayName: string;
  age: number | null;
  heightCm: number | null;
  /** Poids de départ déclaré ; le poids actuel provient des mensurations. */
  startWeightKg: number | null;
  targetWeightMinKg: number | null;
  targetWeightMaxKg: number | null;
  level: FitnessLevel;
  goal: FitnessGoal;
  goalNotes: string;
  trainingDays: Weekday[];
  preferences: UserPreferences;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/* -------------------------------------------------------------------------- */
/*                                  Nutrition                                 */
/* -------------------------------------------------------------------------- */

export interface NutritionGoal {
  id: Id;
  userId: Id;
  /** Date à partir de laquelle l'objectif s'applique. */
  effectiveFrom: IsoDate;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: IsoDateTime;
}

export type FoodUnit = "g" | "ml";

/** Provenance des valeurs nutritionnelles (jamais inventées). */
export type FoodSource = "user" | "ciqual" | "label";

export interface Food {
  id: Id;
  ownerId: Id | null;
  name: string;
  brand: string;
  source: FoodSource;
  /** Référence dans la source (code CIQUAL, EAN…). */
  sourceRef: string;
  unit: FoodUnit;
  /** Valeurs pour 100 g ou 100 ml. */
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100: number | null;
  /** Portion usuelle optionnelle (ex. « 1 œuf » = 50 g). */
  servingName: string;
  servingQuantity: number | null;
  createdAt: IsoDateTime;
}

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export interface Meal {
  id: Id;
  userId: Id;
  date: IsoDate;
  type: MealType;
  name: string;
  createdAt: IsoDateTime;
}

export interface MealItem {
  id: Id;
  userId: Id;
  mealId: Id;
  foodId: Id;
  /** Instantané : l'historique reste exact si l'aliment est modifié. */
  foodName: string;
  quantity: number;
  unit: FoodUnit;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: IsoDateTime;
}

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealWithItems extends Meal {
  items: MealItem[];
  totals: Macros;
}
