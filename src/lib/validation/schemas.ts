import { z } from "zod";
import { MUSCLE_IDS } from "@/types/domain";

/**
 * Schémas de validation des saisies utilisateur.
 * Les bornes sont volontairement larges mais excluent les valeurs aberrantes
 * (fautes de frappe : 720 kg au lieu de 72, etc.).
 */

const optionalNumber = (min: number, max: number, label: string) =>
  z
    .number({ error: `${label} : nombre attendu.` })
    .min(min, `${label} : minimum ${min}.`)
    .max(max, `${label} : maximum ${max}.`)
    .nullable();

const name = (label: string, max = 80) =>
  z.string().trim().min(1, `${label} requis.`).max(max, `${label} : ${max} caractères maximum.`);

export const weekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export const preferencesSchema = z.object({
  defaultRestSec: z.number().int().min(15, "Repos : 15 s minimum.").max(600, "Repos : 10 min maximum."),
  restTimerSound: z.boolean(),
  restTimerVibration: z.boolean(),
  autoStartRestTimer: z.boolean(),
  weightIncrementKg: z.number().min(0.25).max(10),
});

export const profileSchema = z
  .object({
    displayName: name("Nom", 40),
    age: optionalNumber(13, 100, "Âge"),
    heightCm: optionalNumber(100, 250, "Taille"),
    startWeightKg: optionalNumber(30, 300, "Poids"),
    targetWeightMinKg: optionalNumber(30, 300, "Poids cible min."),
    targetWeightMaxKg: optionalNumber(30, 300, "Poids cible max."),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    goal: z.enum(["muscle_gain", "strength", "fat_loss", "maintenance"]),
    goalNotes: z.string().trim().max(280, "Objectifs : 280 caractères maximum."),
    trainingDays: z.array(weekdaySchema).min(1, "Choisissez au moins un jour.").max(7),
    preferences: preferencesSchema,
  })
  .refine(
    (p) =>
      p.targetWeightMinKg === null ||
      p.targetWeightMaxKg === null ||
      p.targetWeightMinKg <= p.targetWeightMaxKg,
    { message: "Le poids cible minimum doit être inférieur ou égal au maximum.", path: ["targetWeightMaxKg"] },
  );
export type ProfileInput = z.infer<typeof profileSchema>;

export const measurementSchema = z
  .object({
    date: z.iso.date("Date invalide."),
    weightKg: optionalNumber(30, 300, "Poids"),
    chestCm: optionalNumber(40, 200, "Tour de poitrine"),
    armCm: optionalNumber(15, 80, "Tour de bras"),
    waistCm: optionalNumber(40, 200, "Tour de taille"),
    thighCm: optionalNumber(25, 120, "Tour de cuisse"),
    bodyFatPct: optionalNumber(2, 60, "Masse grasse"),
    notes: z.string().trim().max(280),
  })
  .refine(
    (m) => [m.weightKg, m.chestCm, m.armCm, m.waistCm, m.thighCm, m.bodyFatPct].some((v) => v !== null),
    { message: "Renseignez au moins une mesure.", path: ["weightKg"] },
  );
export type MeasurementInput = z.infer<typeof measurementSchema>;

export const workoutExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    sets: z.number().int().min(1, "1 série minimum.").max(10, "10 séries maximum."),
    repsMin: optionalNumber(1, 100, "Répétitions min."),
    repsMax: optionalNumber(1, 100, "Répétitions max."),
    durationMinSec: optionalNumber(5, 600, "Durée min."),
    durationMaxSec: optionalNumber(5, 600, "Durée max."),
    restSec: z.number().int().min(0).max(600, "Repos : 10 min maximum."),
    targetWeightKg: optionalNumber(0, 500, "Charge"),
    notes: z.string().trim().max(280),
  })
  .refine((e) => e.repsMin === null || e.repsMax === null || e.repsMin <= e.repsMax, {
    message: "Le minimum de répétitions doit être ≤ au maximum.",
    path: ["repsMax"],
  })
  .refine(
    (e) => e.durationMinSec === null || e.durationMaxSec === null || e.durationMinSec <= e.durationMaxSec,
    { message: "La durée minimum doit être ≤ au maximum.", path: ["durationMaxSec"] },
  );
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;

export const workoutSchema = z.object({
  name: name("Nom de l'entraînement", 60),
  focus: z.string().trim().max(60),
  exercises: z.array(workoutExerciseSchema).min(1, "Ajoutez au moins un exercice.").max(20),
});
export type WorkoutInput = z.infer<typeof workoutSchema>;

export const customExerciseSchema = z.object({
  name: name("Nom de l'exercice", 60),
  equipment: z.enum(["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "other"]),
  trackingType: z.enum(["weight_reps", "reps", "duration"]),
  primaryMuscles: z.array(z.enum(MUSCLE_IDS)).min(1, "Choisissez au moins un muscle principal."),
  secondaryMuscles: z.array(z.enum(MUSCLE_IDS)),
  description: z.string().trim().max(500),
  instructions: z.array(z.string().trim().min(1).max(200)).max(10),
  defaultRestSec: z.number().int().min(0).max(600),
});
export type CustomExerciseInput = z.infer<typeof customExerciseSchema>;

export const setEntrySchema = z.object({
  weightKg: optionalNumber(0, 500, "Charge"),
  reps: optionalNumber(0, 200, "Répétitions"),
  durationSec: optionalNumber(0, 3600, "Durée"),
  rpe: optionalNumber(1, 10, "RPE"),
});
export type SetEntryInput = z.infer<typeof setEntrySchema>;

export const nutritionGoalSchema = z.object({
  calories: z.number().int().min(800, "800 kcal minimum.").max(8000, "8 000 kcal maximum."),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(400),
});
export type NutritionGoalInput = z.infer<typeof nutritionGoalSchema>;

export const foodSchema = z
  .object({
    name: name("Nom de l'aliment", 80),
    brand: z.string().trim().max(60),
    source: z.enum(["user", "ciqual", "label"]),
    sourceRef: z.string().trim().max(60),
    unit: z.enum(["g", "ml"]),
    kcalPer100: z.number().min(0, "Valeur positive attendue.").max(900, "900 kcal / 100 maximum."),
    proteinPer100: z.number().min(0).max(100),
    carbsPer100: z.number().min(0).max(100),
    fatPer100: z.number().min(0).max(100),
    fiberPer100: z.number().min(0).max(100).nullable(),
    servingName: z.string().trim().max(40),
    servingQuantity: z.number().positive().max(2000).nullable(),
  })
  .refine((f) => f.proteinPer100 + f.carbsPer100 + f.fatPer100 <= 100, {
    message: "La somme protéines + glucides + lipides ne peut dépasser 100 g pour 100.",
    path: ["fatPer100"],
  });
export type FoodInput = z.infer<typeof foodSchema>;

export const mealItemSchema = z.object({
  foodId: z.string().min(1, "Choisissez un aliment."),
  quantity: z.number().positive("Quantité supérieure à 0.").max(5000, "5 000 maximum."),
});
export type MealItemInput = z.infer<typeof mealItemSchema>;

/** Résumé lisible du premier message d'erreur par champ. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
