/**
 * Génère supabase/migrations/*_catalog_seed.sql depuis les seeds TypeScript
 * (source unique, partagée avec le mode démo).
 * Usage : npm run db:seed-sql
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { catalogRows } from "../src/data/seed/catalog-rows";

const OUT = resolve(import.meta.dirname, "../supabase/migrations/20261125000002_catalog_seed.sql");

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(lit).join(", ")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const row = (values: unknown[]) => `  (${values.map(lit).join(", ")})`;

const { muscle_groups, exercises, exercise_muscles } = catalogRows();

const sql = `-- Généré par scripts/generate-seed-sql.ts — ne pas modifier à la main.
-- Catalogue partagé : groupes musculaires, exercices, muscles sollicités.

insert into public.muscle_groups (id, name, short_name, region, bias, views) values
${muscle_groups.map((m) => row([m.id, m.name, m.shortName, m.region, m.bias, m.views])).join(",\n")}
on conflict (id) do update set
  name = excluded.name, short_name = excluded.short_name, region = excluded.region,
  bias = excluded.bias, views = excluded.views;

insert into public.exercises (id, owner_id, name, equipment, tracking_type, pattern, description, instructions, default_rest_sec) values
${exercises
  .map((e) => row([e.id, null, e.name, e.equipment, e.trackingType, e.pattern, e.description, e.instructions, e.defaultRestSec]))
  .join(",\n")}
on conflict (id) do update set
  name = excluded.name, equipment = excluded.equipment, tracking_type = excluded.tracking_type,
  pattern = excluded.pattern, description = excluded.description,
  instructions = excluded.instructions, default_rest_sec = excluded.default_rest_sec;

insert into public.exercise_muscles (id, owner_id, exercise_id, muscle_id, role, position) values
${exercise_muscles.map((l) => row([l.id, null, l.exerciseId, l.muscleId, l.role, l.position])).join(",\n")}
on conflict (id) do update set role = excluded.role, position = excluded.position;
`;

writeFileSync(OUT, sql);
console.log(`✓ ${OUT} (${exercises.length} exercices, ${exercise_muscles.length} liens)`);
