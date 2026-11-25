import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "@/lib/supabase/config";
import { DataError, type DataDriver, type Query, type Row, type TableName } from "./driver";

const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Conversion des clés de premier niveau uniquement (les colonnes jsonb restent intactes). */
function mapKeys(obj: Record<string, unknown>, fn: (k: string) => string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[fn(k)] = v;
  return out;
}

/** Colonnes numériques PostgreSQL renvoyées en chaîne par PostgREST. */
function reviveNumbers(row: Record<string, unknown>): Record<string, unknown> {
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string" && NUMERIC_COLUMNS.has(k) && v.trim() !== "") row[k] = Number(v);
  }
  return row;
}
const NUMERIC_COLUMNS = new Set([
  "weightKg",
  "targetWeightKg",
  "startWeightKg",
  "targetWeightMinKg",
  "targetWeightMaxKg",
  "heightCm",
  "chestCm",
  "armCm",
  "waistCm",
  "thighCm",
  "bodyFatPct",
  "value",
  "rpe",
  "totalVolumeKg",
  "kcalPer100",
  "proteinPer100",
  "carbsPer100",
  "fatPer100",
  "fiberPer100",
  "servingQuantity",
  "quantity",
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
  "calories",
]);

/** Échappe les jokers LIKE et les séparateurs de filtre PostgREST. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ");
}

/**
 * Driver PostgreSQL via Supabase. L'isolation par utilisateur est assurée
 * côté base par les politiques RLS (voir supabase/migrations).
 */
export class SupabaseDriver implements DataDriver {
  readonly kind = "supabase" as const;

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list<T extends TableName>(table: T, query: Query<Row<T>> = {}): Promise<Row<T>[]> {
    let q = this.client.from(table).select("*");

    for (const [k, v] of Object.entries(query.where ?? {})) {
      if (v === undefined) continue;
      q = v === null ? q.is(toSnake(k), null) : q.eq(toSnake(k), v as string | number | boolean);
    }
    if (query.in) q = q.in(toSnake(query.in.field), query.in.values);
    if (query.range) {
      const f = toSnake(query.range.field);
      if (query.range.gte !== undefined) q = q.gte(f, query.range.gte);
      if (query.range.lte !== undefined) q = q.lte(f, query.range.lte);
    }
    if (query.search?.term.trim()) {
      q = q.ilike(toSnake(query.search.field), `%${escapeLike(query.search.term.trim())}%`);
    }
    if (query.orderBy) {
      q = q.order(toSnake(query.orderBy.field), {
        ascending: (query.orderBy.direction ?? "asc") === "asc",
        nullsFirst: false,
      });
    }
    if (query.limit !== undefined) q = q.limit(query.limit);

    const { data, error } = await q;
    if (error) throw new DataError(`Lecture impossible (${table}).`, error);
    return (data ?? []).map((r) => reviveNumbers(mapKeys(r, toCamel)) as unknown as Row<T>);
  }

  async get<T extends TableName>(table: T, id: string): Promise<Row<T> | null> {
    const { data, error } = await this.client.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw new DataError(`Lecture impossible (${table}).`, error);
    return data ? (reviveNumbers(mapKeys(data, toCamel)) as unknown as Row<T>) : null;
  }

  async upsert<T extends TableName>(table: T, rows: Row<T> | Row<T>[]): Promise<void> {
    const list = (Array.isArray(rows) ? rows : [rows]).map((r) =>
      mapKeys(r as unknown as Record<string, unknown>, toSnake),
    );
    if (!list.length) return;
    const { error } = await this.client.from(table).upsert(list, { onConflict: "id" });
    if (error) throw new DataError(`Enregistrement impossible (${table}).`, error);
  }

  async remove<T extends TableName>(table: T, ids: string | string[]): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!list.length) return;
    const { error } = await this.client.from(table).delete().in("id", list);
    if (error) throw new DataError(`Suppression impossible (${table}).`, error);
  }

  /** Les fichiers sont rangés sous `<userId>/…` (politique Storage). */
  private objectPath(path: string) {
    return `${this.userId}/${path}`;
  }

  async putBlob(path: string, blob: Blob): Promise<void> {
    const { error } = await this.client.storage
      .from(PHOTO_BUCKET)
      .upload(this.objectPath(path), blob, { upsert: true, contentType: blob.type });
    if (error) throw new DataError("Envoi du fichier impossible.", error);
  }

  async getBlobUrl(path: string): Promise<string | null> {
    const { data, error } = await this.client.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(this.objectPath(path), 60 * 60);
    if (error) return null;
    return data.signedUrl;
  }

  async removeBlob(path: string): Promise<void> {
    const { error } = await this.client.storage.from(PHOTO_BUCKET).remove([this.objectPath(path)]);
    if (error) throw new DataError("Suppression du fichier impossible.", error);
  }
}
