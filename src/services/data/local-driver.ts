import { openDB, type IDBPDatabase } from "idb";
import { DataError, type DataDriver, type Query, type Row, type TableName } from "./driver";
import { applyQuery } from "./query";

const DB_NAME = "workout-demo";
const DB_VERSION = 1;
const BLOB_STORE = "_blobs";

/** Index secondaires utilisés pour éviter les parcours complets fréquents. */
const INDEXES: Record<TableName, string[]> = {
  profiles: [],
  muscle_groups: [],
  exercises: [],
  exercise_muscles: ["exerciseId", "muscleId"],
  workout_programs: [],
  workouts: ["programId"],
  workout_exercises: ["workoutId", "exerciseId"],
  workout_sessions: ["status", "startedAt"],
  workout_sets: ["sessionId", "exerciseId"],
  personal_records: ["exerciseId"],
  body_measurements: ["date"],
  progress_photos: ["date"],
  nutrition_goals: ["effectiveFrom"],
  foods: [],
  meals: ["date"],
  meal_items: ["mealId"],
};

export const LOCAL_TABLES = Object.keys(INDEXES) as TableName[];

/**
 * Driver du mode démo : IndexedDB, mono-utilisateur, aucune dépendance réseau.
 * Les données survivent aux rechargements et aux fermetures du navigateur.
 */
export class LocalDriver implements DataDriver {
  readonly kind = "local" as const;
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private objectUrls = new Map<string, string>();

  constructor(private readonly dbName: string = DB_NAME) {}

  private db(): Promise<IDBPDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new DataError("IndexedDB n'est pas disponible dans ce navigateur."));
    }
    this.dbPromise ??= openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        for (const table of LOCAL_TABLES) {
          if (db.objectStoreNames.contains(table)) continue;
          const store = db.createObjectStore(table, { keyPath: "id" });
          for (const field of INDEXES[table]) store.createIndex(field, field);
        }
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      },
    }).catch((err: unknown) => {
      this.dbPromise = null;
      throw new DataError("Impossible d'ouvrir la base locale.", err);
    });
    return this.dbPromise;
  }

  async list<T extends TableName>(table: T, query: Query<Row<T>> = {}): Promise<Row<T>[]> {
    const db = await this.db();
    const where = (query.where ?? {}) as Record<string, unknown>;
    const indexed = INDEXES[table].find(
      (f) => where[f] !== undefined && where[f] !== null && typeof where[f] !== "boolean",
    );
    const rows = indexed
      ? await db.getAllFromIndex(table, indexed, where[indexed] as IDBValidKey)
      : await db.getAll(table);
    return applyQuery(rows as Row<T>[], query);
  }

  async get<T extends TableName>(table: T, id: string): Promise<Row<T> | null> {
    const db = await this.db();
    return ((await db.get(table, id)) as Row<T> | undefined) ?? null;
  }

  async upsert<T extends TableName>(table: T, rows: Row<T> | Row<T>[]): Promise<void> {
    const list = Array.isArray(rows) ? rows : [rows];
    if (!list.length) return;
    const db = await this.db();
    const tx = db.transaction(table, "readwrite");
    await Promise.all([...list.map((r) => tx.store.put(structuredClone(r))), tx.done]);
  }

  async remove<T extends TableName>(table: T, ids: string | string[]): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!list.length) return;
    const db = await this.db();
    const tx = db.transaction(table, "readwrite");
    await Promise.all([...list.map((id) => tx.store.delete(id)), tx.done]);
  }

  async putBlob(path: string, blob: Blob): Promise<void> {
    const db = await this.db();
    await db.put(BLOB_STORE, blob, path);
    this.revoke(path);
  }

  async getBlobUrl(path: string): Promise<string | null> {
    const cached = this.objectUrls.get(path);
    if (cached) return cached;
    const db = await this.db();
    const blob = (await db.get(BLOB_STORE, path)) as Blob | undefined;
    if (!blob || typeof URL.createObjectURL !== "function") return null;
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(path, url);
    return url;
  }

  async removeBlob(path: string): Promise<void> {
    const db = await this.db();
    await db.delete(BLOB_STORE, path);
    this.revoke(path);
  }

  /** Efface toutes les données locales (réinitialisation de la démo). */
  async clearAll(): Promise<void> {
    const db = await this.db();
    const stores = [...LOCAL_TABLES, BLOB_STORE];
    const tx = db.transaction(stores, "readwrite");
    await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
    for (const path of [...this.objectUrls.keys()]) this.revoke(path);
  }

  private revoke(path: string) {
    const url = this.objectUrls.get(path);
    if (url) URL.revokeObjectURL(url);
    this.objectUrls.delete(path);
  }
}
