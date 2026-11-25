import { z } from "zod";
import type { DataDriver, Row, TableName } from "./data/driver";
import { DataError } from "./data/driver";

/** Tables exportées (données de l'utilisateur ; le catalogue partagé est exclu). */
export const BACKUP_TABLES = [
  "profiles",
  "workout_programs",
  "workouts",
  "workout_exercises",
  "workout_sessions",
  "workout_sets",
  "personal_records",
  "body_measurements",
  "nutrition_goals",
  "foods",
  "meals",
  "meal_items",
  "exercises",
  "exercise_muscles",
] as const satisfies readonly TableName[];

type BackupTable = (typeof BACKUP_TABLES)[number];
export const BACKUP_VERSION = 1;

export interface Backup {
  app: "workout";
  version: number;
  exportedAt: string;
  tables: { [T in BackupTable]: Row<T>[] };
}

const backupSchema = z.object({
  app: z.literal("workout"),
  version: z.number().int().max(BACKUP_VERSION, "Sauvegarde créée par une version plus récente de l'application."),
  exportedAt: z.string(),
  tables: z.object(Object.fromEntries(BACKUP_TABLES.map((t) => [t, z.array(z.record(z.string(), z.unknown()))])) as Record<BackupTable, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>),
});

/** Copie complète des données de l'utilisateur (hors photos et catalogue partagé). */
export async function exportBackup(driver: DataDriver, userId: string): Promise<Backup> {
  const tables = {} as Backup["tables"];
  for (const t of BACKUP_TABLES) {
    const rows = (await driver.list(t)) as unknown as Record<string, unknown>[];
    // Catalogue partagé (ownerId null) exclu ; seules les entrées personnelles sont gardées.
    (tables as Record<string, unknown[]>)[t] = rows.filter((r) => !("ownerId" in r) || r.ownerId === userId);
  }
  return { app: "workout", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

/** Valide un fichier de sauvegarde et réattribue toutes les lignes à `userId`. */
export function parseBackup(json: unknown, userId: string): Backup {
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new DataError("Fichier de sauvegarde invalide ou incomplet.");
  const data = parsed.data as unknown as Backup;
  if (data.tables.profiles.length !== 1) throw new DataError("La sauvegarde doit contenir exactement un profil.");
  const rewrite = (r: Record<string, unknown>) => ({
    ...r,
    ...("userId" in r ? { userId } : {}),
    ...("ownerId" in r && r.ownerId !== null ? { ownerId: userId } : {}),
  });
  const tables = Object.fromEntries(
    Object.entries(data.tables).map(([t, rows]) => [
      t,
      (rows as unknown as Record<string, unknown>[]).map((r) => (t === "profiles" ? { ...rewrite(r), id: userId } : rewrite(r))),
    ]),
  ) as Backup["tables"];
  return { ...data, tables };
}

/** Remplace les données de l'utilisateur par celles de la sauvegarde (mode démo). */
export async function restoreBackup(driver: DataDriver, backup: Backup): Promise<void> {
  // Ordre parent → enfant pour respecter les dépendances.
  for (const t of BACKUP_TABLES) {
    const rows = backup.tables[t] as Row<typeof t>[];
    if (rows.length) await driver.upsert(t, rows);
  }
}
