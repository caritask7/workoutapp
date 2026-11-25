import type {
  BodyMeasurement,
  Exercise,
  ExerciseMuscle,
  Food,
  Meal,
  MealItem,
  MuscleGroup,
  NutritionGoal,
  PersonalRecord,
  Profile,
  ProgressPhoto,
  Workout,
  WorkoutExercise,
  WorkoutProgram,
  WorkoutSession,
  WorkoutSet,
} from "@/types/domain";

/**
 * Correspondance nom de table → type de ligne.
 * Les noms reprennent le schéma PostgreSQL (supabase/migrations).
 */
export interface Tables {
  profiles: Profile;
  muscle_groups: MuscleGroup;
  exercises: Exercise;
  exercise_muscles: ExerciseMuscle;
  workout_programs: WorkoutProgram;
  workouts: Workout;
  workout_exercises: WorkoutExercise;
  workout_sessions: WorkoutSession;
  workout_sets: WorkoutSet;
  personal_records: PersonalRecord;
  body_measurements: BodyMeasurement;
  progress_photos: ProgressPhoto;
  nutrition_goals: NutritionGoal;
  foods: Food;
  meals: Meal;
  meal_items: MealItem;
}

export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T];

type Scalar = string | number | boolean | null;

/** Requête volontairement réduite : traduisible en IndexedDB comme en SQL. */
export interface Query<R> {
  /** Égalités strictes (AND). */
  where?: { [K in keyof R]?: R[K] extends Scalar ? R[K] : never };
  /** Appartenance à une liste de valeurs. */
  in?: { field: keyof R & string; values: Scalar[] };
  /** Bornes inclusives sur un champ ordonnable. */
  range?: { field: keyof R & string; gte?: string | number; lte?: string | number };
  /** Recherche « contient », insensible à la casse et aux accents côté local. */
  search?: { field: keyof R & string; term: string };
  orderBy?: { field: keyof R & string; direction?: "asc" | "desc" };
  limit?: number;
}

/**
 * Contrat de persistance. Chaque implémentation garantit que l'utilisateur
 * ne lit et n'écrit que ses propres données (RLS côté Supabase, base locale
 * mono-utilisateur côté démo) ainsi que le catalogue partagé.
 */
export interface DataDriver {
  readonly kind: "local" | "supabase";
  list<T extends TableName>(table: T, query?: Query<Row<T>>): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  /** Insertion ou remplacement par identifiant. */
  upsert<T extends TableName>(table: T, rows: Row<T> | Row<T>[]): Promise<void>;
  remove<T extends TableName>(table: T, ids: string | string[]): Promise<void>;
  /** Stockage binaire (photos de progression). */
  putBlob(path: string, blob: Blob): Promise<void>;
  getBlobUrl(path: string): Promise<string | null>;
  removeBlob(path: string): Promise<void>;
}

export class DataError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DataError";
  }
}
