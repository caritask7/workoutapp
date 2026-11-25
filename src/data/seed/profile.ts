import type { FitnessGoal, FitnessLevel, UserPreferences, Weekday } from "@/types/domain";

/** Profil de démonstration (cahier des charges §6.H). Modifiable dans l'écran Profil. */
export const DEMO_PROFILE = {
  displayName: "Thomas",
  age: 21,
  heightCm: 180,
  startWeightKg: 72,
  targetWeightMinKg: 76,
  targetWeightMaxKg: 78,
  level: "beginner" as FitnessLevel,
  goal: "muscle_gain" as FitnessGoal,
  goalNotes: "Prise de muscle et de volume.",
  trainingDays: [1, 3, 5] as Weekday[],
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultRestSec: 90,
  restTimerSound: true,
  restTimerVibration: true,
  autoStartRestTimer: true,
  weightIncrementKg: 2.5,
};

/** Objectifs nutritionnels initiaux (cahier des charges §6.G). */
export const DEFAULT_NUTRITION_GOAL = {
  calories: 2750,
  proteinG: 140,
  carbsG: 350,
  fatG: 85,
};
