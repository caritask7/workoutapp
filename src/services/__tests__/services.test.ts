import { beforeEach, describe, expect, it } from "vitest";
import { LocalDriver } from "../data/local-driver";
import { ensureLocalCatalog, ensureUserData } from "../bootstrap";
import { createServices, type Services } from "..";
import { DEMO_USER_ID } from "../context";
import { EXERCISE_SEEDS } from "@/data/seed/exercises";
import { toIsoDate } from "@/lib/domain/dates";

let services: Services;
let driver: LocalDriver;
let dbCounter = 0;

beforeEach(async () => {
  driver = new LocalDriver(`test-${++dbCounter}`);
  const ctx = { driver, userId: DEMO_USER_ID };
  await ensureLocalCatalog(ctx);
  await ensureUserData(ctx);
  services = createServices(ctx);
});

describe("bootstrap", () => {
  it("précharge profil, programme A/B/C et objectifs, sans données fictives", async () => {
    const profile = await services.profile.getProfile();
    expect(profile).toMatchObject({ age: 21, heightCm: 180, startWeightKg: 72, targetWeightMinKg: 76, targetWeightMaxKg: 78, level: "beginner", trainingDays: [1, 3, 5] });

    const workouts = await services.workouts.listWorkouts();
    expect(workouts.map((w) => w.name)).toEqual(["Full Body A", "Full Body B", "Full Body C"]);
    expect(workouts.map((w) => w.exercises.length)).toEqual([6, 7, 8]);
    const a = workouts[0].exercises.map((e) => [e.exercise.name, e.sets, e.repsMin, e.repsMax]);
    expect(a[0]).toEqual(["Squat", 3, 8, 10]);
    expect(a[5]).toEqual(["Crunch", 2, 15, 15]);
    const plank = workouts[2].exercises.at(-1);
    expect(plank).toMatchObject({ sets: 2, durationMinSec: 30, durationMaxSec: 45 });

    expect(await services.nutrition.getGoal()).toMatchObject({ calories: 2750, proteinG: 140, carbsG: 350, fatG: 85 });
    expect(await services.sessions.listCompletedSessions()).toEqual([]);
    expect(await services.body.listMeasurements()).toEqual([]);
    expect(await services.nutrition.searchFoods("")).toEqual([]);
  });

  it("est idempotent", async () => {
    expect((await ensureUserData({ driver, userId: DEMO_USER_ID })).created).toBe(false);
    expect(await services.workouts.listWorkouts()).toHaveLength(3);
  });

  it("charge tout le catalogue d'exercices avec leurs muscles", async () => {
    const all = await services.catalog.listExercises();
    expect(all).toHaveLength(EXERCISE_SEEDS.length);
    const squat = await services.catalog.getExercise("squat");
    expect(squat?.primaryMuscles).toEqual(["quads", "glutes"]);
  });
});

describe("séance active", () => {
  it("démarre, saisit, met en pause, reprend et termine avec records", async () => {
    const [fbA] = await services.workouts.listWorkouts();
    const session = await services.sessions.startSession(fbA.id);
    await expect(services.sessions.startSession(fbA.id)).rejects.toThrow(/déjà en cours/);

    let sets = await services.sessions.listSets(session.id);
    expect(sets).toHaveLength(3 + 3 + 3 + 2 + 2 + 2);
    expect(sets.filter((s) => s.planIndex === 0).every((s) => s.reps === 10)).toBe(true);

    const squatSets = sets.filter((s) => s.planIndex === 0);
    await services.sessions.updateSet(squatSets[0].id, { weightKg: 60, reps: 10, completed: true });
    await services.sessions.updateSet(squatSets[1].id, { weightKg: 62.5, reps: 8, completed: true });

    const paused = await services.sessions.pauseSession(session.id);
    expect(paused.status).toBe("paused");
    // Reprise depuis la base : les saisies sont intactes.
    sets = await services.sessions.listSets(session.id);
    expect(sets.filter((s) => s.completed)).toHaveLength(2);
    const resumed = await services.sessions.resumeSession(session.id);
    expect(resumed.status).toBe("in_progress");
    expect(await services.sessions.getActiveSession()).toMatchObject({ id: session.id });

    await expect(services.sessions.updateSet(squatSets[2].id, { weightKg: 900 })).rejects.toThrow();

    const crunch = sets.find((s) => s.exerciseId === "crunch");
    await services.sessions.updateSet(crunch!.id, { reps: 20, completed: true });

    const summary = await services.sessions.finishSession(session.id);
    expect(summary.session).toMatchObject({ status: "completed", totalSets: 3, totalVolumeKg: 600 + 500 });
    expect(summary.session.durationSec).toBeGreaterThanOrEqual(0);
    expect(summary.exercisesDone).toBe(2);
    const types = summary.records.map((r) => `${r.exerciseId}:${r.type}`).sort();
    expect(types).toEqual(["crunch:max_reps", "squat:est_1rm", "squat:max_set_volume", "squat:max_weight"]);
    expect(await services.sessions.getActiveSession()).toBeNull();

    // Deuxième séance : la colonne « précédent » et le pré-remplissage utilisent l'historique.
    const s2 = await services.sessions.startSession(fbA.id);
    const s2Sets = (await services.sessions.listSets(s2.id)).filter((s) => s.planIndex === 0);
    expect(s2Sets.map((s) => s.weightKg)).toEqual([60, 62.5, 62.5]);
    await services.sessions.updateSet(s2Sets[0].id, { weightKg: 60, reps: 10, completed: true });
    const s2Summary = await services.sessions.finishSession(s2.id);
    expect(s2Summary.records).toEqual([]);

    const history = await services.sessions.exerciseHistory("squat");
    expect(history).toHaveLength(2);
    expect(history[1].bestWeightKg).toBe(62.5);

    // Suppression de la 1re séance : records recalculés à partir de la 2e.
    await services.sessions.deleteSession(session.id);
    const records = await services.sessions.listRecords("squat");
    expect(records.find((r) => r.type === "max_weight")?.value).toBe(60);
  });

  it("refuse de terminer une séance sans série validée et permet l'abandon", async () => {
    const [fbA] = await services.workouts.listWorkouts();
    const session = await services.sessions.startSession(fbA.id);
    await expect(services.sessions.finishSession(session.id)).rejects.toThrow(/au moins une série/);
    await services.sessions.discardSession(session.id);
    expect(await services.sessions.getActiveSession()).toBeNull();
    expect(await services.sessions.listSets(session.id)).toEqual([]);
  });
});

describe("entraînements personnalisés", () => {
  it("crée, modifie, duplique et supprime en conservant l'historique", async () => {
    const created = await services.workouts.saveWorkout({
      name: "Full Body D",
      focus: "Force",
      exercises: [
        { exerciseId: "deadlift", sets: 3, repsMin: 5, repsMax: 5, durationMinSec: null, durationMaxSec: null, restSec: 180, targetWeightKg: 80, notes: "" },
        { exerciseId: "plank", sets: 2, repsMin: null, repsMax: null, durationMinSec: 30, durationMaxSec: 60, restSec: 60, targetWeightKg: null, notes: "" },
      ],
    });
    expect(created).toMatchObject({ isCustom: true, position: 3 });
    expect(created.exercises.map((e) => e.exerciseId)).toEqual(["deadlift", "plank"]);

    const updated = await services.workouts.saveWorkout(
      { name: "Full Body D", focus: "Force", exercises: [{ ...created.exercises[1], notes: "" }] },
      created.id,
    );
    expect(updated.exercises).toHaveLength(1);

    const copy = await services.workouts.duplicateWorkout(created.id);
    expect(copy.name).toBe("Full Body D (copie)");

    await expect(
      services.workouts.saveWorkout({ name: "", focus: "", exercises: [] }),
    ).rejects.toThrow();

    const session = await services.sessions.startSession(created.id);
    const [first] = await services.sessions.listSets(session.id);
    await services.sessions.updateSet(first.id, { durationSec: 45, completed: true });
    await services.sessions.finishSession(session.id);

    await services.workouts.deleteWorkout(created.id);
    expect(await services.workouts.getWorkout(created.id)).toBeNull();
    const [kept] = await services.sessions.listCompletedSessions();
    expect(kept).toMatchObject({ workoutId: null, workoutName: "Full Body D" });
  });

  it("exercices personnalisés : création et protection du catalogue", async () => {
    const ex = await services.catalog.createCustomExercise({
      name: "Pull-over poulie",
      equipment: "cable",
      trackingType: "weight_reps",
      primaryMuscles: ["lats"],
      secondaryMuscles: ["chest", "lats"],
      description: "",
      instructions: [],
      defaultRestSec: 75,
    });
    expect(ex.secondaryMuscles).toEqual(["chest"]);
    await expect(services.catalog.deleteCustomExercise("squat")).rejects.toThrow(/catalogue/);
    await services.catalog.deleteCustomExercise(ex.id);
    expect(await services.catalog.getExercise(ex.id)).toBeNull();
  });
});

describe("nutrition", () => {
  it("aliment saisi, repas, totaux, historique et objectifs", async () => {
    const today = toIsoDate();
    const food = await services.nutrition.saveFood({
      name: "Flocons d'avoine",
      brand: "",
      source: "label",
      sourceRef: "",
      unit: "g",
      kcalPer100: 370,
      proteinPer100: 13,
      carbsPer100: 60,
      fatPer100: 7,
      fiberPer100: null,
      servingName: "",
      servingQuantity: null,
    });
    expect(await services.nutrition.searchFoods("avoine")).toHaveLength(1);
    expect(await services.nutrition.searchFoods("FLOCONS D'AVOINE")).toHaveLength(1);

    const item = await services.nutrition.addItem({ date: today, type: "breakfast" }, food.id, 100);
    await services.nutrition.addItem({ date: today, type: "breakfast" }, food.id, 50);
    let day = await services.nutrition.getDay(today);
    expect(day.meals).toHaveLength(1);
    expect(day.totals).toEqual({ kcal: 555, proteinG: 19.5, carbsG: 90, fatG: 10.5 });

    await services.nutrition.updateItemQuantity(item.id, 200);
    day = await services.nutrition.getDay(today);
    expect(day.totals.kcal).toBe(925);

    await expect(services.nutrition.addItem({ date: today, type: "lunch" }, food.id, 0)).rejects.toThrow();

    // L'historique survit à la suppression de l'aliment (instantané).
    await services.nutrition.deleteFood(food.id);
    day = await services.nutrition.getDay(today);
    expect(day.totals.kcal).toBe(925);
    expect(await services.nutrition.dailyTotals(today, today)).toHaveLength(1);

    await services.nutrition.setGoal({ calories: 3000, proteinG: 150, carbsG: 380, fatG: 90 });
    expect((await services.nutrition.getGoal())?.calories).toBe(3000);
    expect(await services.nutrition.listGoals()).toHaveLength(2);
  });

  it("refuse des valeurs nutritionnelles incohérentes", async () => {
    await expect(
      services.nutrition.saveFood({
        name: "Erreur",
        brand: "",
        source: "user",
        sourceRef: "",
        unit: "g",
        kcalPer100: 100,
        proteinPer100: 60,
        carbsPer100: 60,
        fatPer100: 10,
        fiberPer100: null,
        servingName: "",
        servingQuantity: null,
      }),
    ).rejects.toThrow(/100 g/);
  });
});

describe("corps & profil", () => {
  it("mesures fusionnées par jour et profil validé", async () => {
    await services.body.saveMeasurement({ date: "2026-11-20", weightKg: 72.4, chestCm: null, armCm: null, waistCm: null, thighCm: null, bodyFatPct: null, notes: "" });
    await services.body.saveMeasurement({ date: "2026-11-20", weightKg: null, chestCm: 104, armCm: null, waistCm: 77, thighCm: null, bodyFatPct: null, notes: "" });
    const list = await services.body.listMeasurements();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ weightKg: 72.4, chestCm: 104, waistCm: 77 });

    await expect(
      services.body.saveMeasurement({ date: "2026-11-21", weightKg: null, chestCm: null, armCm: null, waistCm: null, thighCm: null, bodyFatPct: null, notes: "" }),
    ).rejects.toThrow(/au moins une mesure/);

    const profile = (await services.profile.getProfile())!;
    const next = await services.profile.updateProfile({ ...profile, displayName: "Alex", trainingDays: [5, 1, 3] });
    expect(next).toMatchObject({ displayName: "Alex", trainingDays: [1, 3, 5] });
    await expect(services.profile.updateProfile({ ...profile, targetWeightMinKg: 80, targetWeightMaxKg: 76 })).rejects.toThrow();
  });
});
