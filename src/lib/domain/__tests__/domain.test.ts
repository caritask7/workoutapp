import { describe, expect, it } from "vitest";
import { addDays, diffDays, isoWeekday, startOfWeek, weekDates } from "../dates";
import { detectRecords, estimateOneRepMax, formatTarget, programWeek, sessionElapsedSec, totalVolume } from "../training";
import { atwaterDeviation, goalForDate, macroProgress, macrosForQuantity, sumMacros } from "../nutrition";
import { latestValue, weightGoalProgress } from "../body";
import type { BodyMeasurement, WorkoutSet } from "@/types/domain";

const set = (p: Partial<WorkoutSet>): WorkoutSet => ({
  id: "s",
  userId: "u",
  sessionId: "x",
  exerciseId: "squat",
  planIndex: 0,
  setNumber: 1,
  weightKg: null,
  reps: null,
  durationSec: null,
  rpe: null,
  completed: true,
  completedAt: null,
  ...p,
});

describe("dates", () => {
  it("calcule le lundi et les jours ISO", () => {
    expect(isoWeekday("2026-11-25")).toBe(3); // mercredi
    expect(isoWeekday("2026-11-29")).toBe(7); // dimanche
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23");
    expect(weekDates("2026-11-25")).toHaveLength(7);
    expect(weekDates("2026-11-25")[6]).toBe("2026-11-29");
  });
  it("gère les changements de mois et l'heure d'été", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });
});

describe("entraînement", () => {
  it("volume = somme charge × reps des séries validées uniquement", () => {
    expect(
      totalVolume([
        set({ weightKg: 32, reps: 10 }),
        set({ weightKg: 32, reps: 9 }),
        set({ weightKg: 32, reps: 8, completed: false }),
        set({ weightKg: null, reps: 15 }),
      ]),
    ).toBe(608);
  });
  it("1RM estimé (Epley)", () => {
    expect(estimateOneRepMax(85, 8)).toBe(107.7);
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(0, 5)).toBe(0);
  });
  it("semaine du programme bornée à [1, durée]", () => {
    expect(programWeek("2026-11-02", "2026-11-25", 12)).toBe(4);
    expect(programWeek("2026-11-30", "2026-11-25", 12)).toBe(1);
    expect(programWeek("2025-01-01", "2026-11-25", 12)).toBe(12);
  });
  it("durée effective hors pauses", () => {
    const s = { startedAt: "2026-11-25T10:00:00Z", endedAt: "2026-11-25T11:10:00Z", pausedAt: null, pausedMs: 10 * 60_000 };
    expect(sessionElapsedSec(s)).toBe(60 * 60);
    const paused = { ...s, endedAt: null, pausedAt: "2026-11-25T10:30:00Z", pausedMs: 0 };
    expect(sessionElapsedSec(paused, new Date("2026-11-25T12:00:00Z"))).toBe(30 * 60);
  });
  it("détecte les records battus, un seul par type", () => {
    const rec = detectRecords(
      [set({ id: "a", weightKg: 80, reps: 8 }), set({ id: "b", weightKg: 85, reps: 6 }), set({ id: "c", weightKg: 60, reps: 15 })],
      { squat: "weight_reps" },
      [{ exerciseId: "squat", type: "max_weight", value: 82.5 }],
    );
    const byType = Object.fromEntries(rec.map((r) => [r.type, r]));
    expect(byType.max_weight).toMatchObject({ value: 85, setId: "b", previous: 82.5 });
    expect(byType.max_set_volume).toMatchObject({ value: 900, setId: "c", previous: null });
    expect(byType.est_1rm.setId).toBe("b");
  });
  it("ne crée pas de record égal à l'existant", () => {
    const rec = detectRecords([set({ weightKg: 80, reps: 5 })], { squat: "weight_reps" }, [
      { exerciseId: "squat", type: "max_weight", value: 80 },
      { exerciseId: "squat", type: "est_1rm", value: 200 },
      { exerciseId: "squat", type: "max_set_volume", value: 400 },
    ]);
    expect(rec).toEqual([]);
  });
  it("formate les cibles", () => {
    const base = { repsMin: null, repsMax: null, durationMinSec: null, durationMaxSec: null };
    expect(formatTarget({ ...base, trackingType: "weight_reps", repsMin: 8, repsMax: 10 })).toBe("8-10");
    expect(formatTarget({ ...base, trackingType: "reps", repsMin: 15, repsMax: 15 })).toBe("15");
    expect(formatTarget({ ...base, trackingType: "duration", durationMinSec: 30, durationMaxSec: 45 })).toBe("30-45 s");
  });
});

describe("nutrition", () => {
  const oats = { kcalPer100: 370, proteinPer100: 13, carbsPer100: 60, fatPer100: 7 };
  it("calcule les apports pour une quantité", () => {
    expect(macrosForQuantity(oats, 80)).toEqual({ kcal: 296, proteinG: 10.4, carbsG: 48, fatG: 5.6 });
    expect(macrosForQuantity(oats, -5).kcal).toBe(0);
  });
  it("additionne sans dérive flottante", () => {
    const t = sumMacros([
      { kcal: 0.1, proteinG: 0.1, carbsG: 0.2, fatG: 0.1 },
      { kcal: 0.2, proteinG: 0.2, carbsG: 0.1, fatG: 0.2 },
    ]);
    expect(t.proteinG).toBe(0.3);
  });
  it("pourcentages des macros", () => {
    const p = macroProgress({ kcal: 2150, proteinG: 118, carbsG: 285, fatG: 68 }, { proteinG: 140, carbsG: 350, fatG: 85 });
    expect(p.map((m) => m.percent)).toEqual([84, 81, 80]);
  });
  it("contrôle de cohérence Atwater", () => {
    expect(atwaterDeviation(oats)).toBeLessThan(0.05);
    expect(atwaterDeviation({ ...oats, kcalPer100: 100 })).toBeGreaterThan(1);
  });
  it("objectif applicable à une date", () => {
    const goals = [{ effectiveFrom: "2026-11-01", v: 1 }, { effectiveFrom: "2026-11-20", v: 2 }];
    expect(goalForDate(goals, "2026-11-10")?.v).toBe(1);
    expect(goalForDate(goals, "2026-11-25")?.v).toBe(2);
    expect(goalForDate(goals, "2026-10-01")).toBeNull();
  });
});

describe("corps", () => {
  it("progression vers le poids cible", () => {
    expect(weightGoalProgress(72, 73.12, 76)).toBe(28);
    expect(weightGoalProgress(72, 70, 76)).toBe(0);
    expect(weightGoalProgress(72, 79, 76)).toBe(100);
  });
  it("dernière valeur renseignée", () => {
    const m = (date: string, weightKg: number | null) => ({ date, weightKg }) as BodyMeasurement;
    expect(latestValue([m("2026-11-01", 72), m("2026-11-20", null), m("2026-11-10", 72.6)], "weightKg")).toEqual({
      value: 72.6,
      date: "2026-11-10",
    });
  });
});

import { sessionDensity, suggestWorkout } from "../builder";
import { catalogRows } from "@/data/seed/catalog-rows";
import { composeExercise } from "@/services/catalog";

describe("générateur de séance", () => {
  const rows = catalogRows();
  const catalog = rows.exercises.map((e) => composeExercise(e, rows.exercise_muscles));
  const byId = new Map(catalog.map((e) => [e.id, e]));

  it("privilégie les mouvements de base et ne double pas un muscle couvert", () => {
    const draft = suggestWorkout(["quads", "chest", "triceps", "biceps"], catalog);
    expect(draft.map((d) => d.exerciseId)).toEqual(["squat", "bench_press", "dip", "biceps_curl"]);
    expect(draft.map((d) => d.sets)).toEqual([3, 3, 2, 2]);
  });
  it("gainage en durée et en fin de séance", () => {
    const draft = suggestWorkout(["abs", "lats"], catalog);
    expect(draft.at(-1)?.exerciseId).toBe("crunch");
    expect(suggestWorkout([], catalog)).toEqual([]);
  });
  it("densité et ratio push/pull", () => {
    const d = sessionDensity(
      [
        { exerciseId: "bench_press", sets: 3 },
        { exerciseId: "lat_pulldown", sets: 3 },
        { exerciseId: "lateral_raise", sets: 2 },
        { exerciseId: "squat", sets: 4 },
      ],
      byId,
    );
    expect(d).toMatchObject({ totalSets: 12, zone: "target", pushPct: 63, pullPct: 37 });
    expect(d.setsByMuscle.quads).toBe(4);
  });
});
