import { describe, expect, it } from "vitest";
import { LocalDriver } from "../data/local-driver";
import { ensureLocalCatalog, ensureUserData } from "../bootstrap";
import { createServices } from "..";
import { DEMO_USER_ID } from "../context";
import { exportBackup, parseBackup, restoreBackup } from "../backup";
import { toIsoDate } from "@/lib/domain/dates";

describe("sauvegarde", () => {
  it("exporte, valide, réattribue et restaure les données", async () => {
    const source = new LocalDriver("backup-src");
    const ctx = { driver: source, userId: DEMO_USER_ID };
    await ensureLocalCatalog(ctx);
    await ensureUserData(ctx);
    const s = createServices(ctx);
    const [fbA] = await s.workouts.listWorkouts();
    const session = await s.sessions.startSession(fbA.id);
    const [set] = await s.sessions.listSets(session.id);
    await s.sessions.updateSet(set.id, { weightKg: 50, reps: 8, completed: true });
    await s.sessions.finishSession(session.id);
    const food = await s.nutrition.saveFood({ name: "Riz", brand: "", source: "label", sourceRef: "", unit: "g", kcalPer100: 350, proteinPer100: 7, carbsPer100: 77, fatPer100: 1, fiberPer100: null, servingName: "", servingQuantity: null });
    await s.nutrition.addItem({ date: toIsoDate(), type: "lunch" }, food.id, 100);

    const backup = await exportBackup(source, DEMO_USER_ID);
    expect(backup.tables.exercises).toEqual([]); // catalogue partagé exclu
    expect(backup.tables.workout_sessions).toHaveLength(1);

    // Réattribution vers un autre utilisateur
    const other = "11111111-1111-4111-8111-111111111111";
    const moved = parseBackup(JSON.parse(JSON.stringify(backup)), other);
    expect(moved.tables.profiles[0].id).toBe(other);
    expect(moved.tables.workout_sets.every((r) => r.userId === other)).toBe(true);
    expect(moved.tables.foods[0].ownerId).toBe(other);

    const target = new LocalDriver("backup-dst");
    await ensureLocalCatalog({ driver: target, userId: other });
    await restoreBackup(target, moved);
    const t = createServices({ driver: target, userId: other });
    expect((await t.sessions.listCompletedSessions())[0].totalVolumeKg).toBe(400);
    expect((await t.nutrition.getDay(toIsoDate())).totals.kcal).toBe(350);
    expect(await t.workouts.listWorkouts()).toHaveLength(3);
  });

  it("rejette un fichier invalide", () => {
    expect(() => parseBackup({ app: "autre" }, DEMO_USER_ID)).toThrow(/invalide/);
    expect(() => parseBackup({ app: "workout", version: 99, exportedAt: "", tables: {} }, DEMO_USER_ID)).toThrow();
  });
});
