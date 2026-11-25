/**
 * Programme préchargé : 3 séances Full Body en rotation, 12 semaines.
 * Séries / répétitions conformes au cahier des charges.
 */
export interface WorkoutExerciseSeed {
  exerciseId: string;
  sets: number;
  repsMin?: number;
  repsMax?: number;
  durationMinSec?: number;
  durationMaxSec?: number;
  restSec: number;
}

export interface WorkoutSeed {
  key: "A" | "B" | "C";
  name: string;
  focus: string;
  exercises: WorkoutExerciseSeed[];
}

export const PROGRAM_SEED = {
  name: "Prise de masse — Full Body 3×",
  description: "Rotation Full Body A / B / C, trois séances par semaine, surcharge progressive.",
  durationWeeks: 12,
  sessionsPerWeek: 3,
};

export const WORKOUT_SEEDS: WorkoutSeed[] = [
  {
    key: "A",
    name: "Full Body A",
    focus: "Hypertrophie · Base",
    exercises: [
      { exerciseId: "squat", sets: 3, repsMin: 8, repsMax: 10, restSec: 150 },
      { exerciseId: "bench_press", sets: 3, repsMin: 8, repsMax: 12, restSec: 150 },
      { exerciseId: "cable_row", sets: 3, repsMin: 10, repsMax: 12, restSec: 120 },
      { exerciseId: "romanian_deadlift", sets: 2, repsMin: 10, repsMax: 12, restSec: 120 },
      { exerciseId: "lateral_raise", sets: 2, repsMin: 12, repsMax: 15, restSec: 75 },
      { exerciseId: "crunch", sets: 2, repsMin: 15, repsMax: 15, restSec: 60 },
    ],
  },
  {
    key: "B",
    name: "Full Body B",
    focus: "Hypertrophie · Volume",
    exercises: [
      { exerciseId: "leg_press", sets: 3, repsMin: 10, repsMax: 12, restSec: 120 },
      { exerciseId: "incline_dumbbell_press", sets: 3, repsMin: 8, repsMax: 12, restSec: 120 },
      { exerciseId: "lat_pulldown", sets: 3, repsMin: 10, repsMax: 12, restSec: 120 },
      { exerciseId: "hip_thrust", sets: 2, repsMin: 10, repsMax: 12, restSec: 90 },
      { exerciseId: "dumbbell_shoulder_press", sets: 2, repsMin: 10, repsMax: 12, restSec: 90 },
      { exerciseId: "biceps_curl", sets: 2, repsMin: 10, repsMax: 12, restSec: 75 },
      { exerciseId: "standing_calf_raise", sets: 2, repsMin: 15, repsMax: 15, restSec: 60 },
    ],
  },
  {
    key: "C",
    name: "Full Body C",
    focus: "Hypertrophie · Machines & isolation",
    exercises: [
      { exerciseId: "goblet_squat", sets: 3, repsMin: 10, repsMax: 12, restSec: 90 },
      { exerciseId: "chest_press", sets: 3, repsMin: 10, repsMax: 12, restSec: 90 },
      { exerciseId: "seated_row", sets: 3, repsMin: 10, repsMax: 12, restSec: 90 },
      { exerciseId: "leg_curl", sets: 2, repsMin: 12, repsMax: 12, restSec: 75 },
      { exerciseId: "lateral_raise", sets: 2, repsMin: 12, repsMax: 15, restSec: 75 },
      { exerciseId: "hammer_curl", sets: 2, repsMin: 10, repsMax: 12, restSec: 75 },
      { exerciseId: "triceps_pushdown", sets: 2, repsMin: 10, repsMax: 12, restSec: 75 },
      { exerciseId: "plank", sets: 2, durationMinSec: 30, durationMaxSec: 45, restSec: 60 },
    ],
  },
];
