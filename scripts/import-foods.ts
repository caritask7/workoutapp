/**
 * Importe une table d'aliments de référence (CSV) :
 *   npm run foods:import -- chemin/vers/table.csv [--source ciqual]
 * Produit :
 *   - src/data/seed/foods.generated.json (chargé en mode démo)
 *   - supabase/migrations/20261125000003_foods_seed.sql (catalogue Supabase)
 * Voir src/lib/import/foods-csv.ts pour le format attendu.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFoodsCsv } from "../src/lib/import/foods-csv";

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error("Usage : npm run foods:import -- <fichier.csv> [--source ciqual|label|user]");
  process.exit(1);
}
const sourceArg = rest[rest.indexOf("--source") + 1];
const result = parseFoodsCsv(readFileSync(file, "utf8"), { source: rest.includes("--source") ? (sourceArg as "ciqual") : "ciqual" });

const root = resolve(import.meta.dirname, "..");
writeFileSync(resolve(root, "src/data/seed/foods.generated.json"), JSON.stringify(result.foods, null, 0) + "\n");

const lit = (v: unknown) => (v === null ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const rows = result.foods.map(
  (f) =>
    `  (${[f.id, null, f.name, f.brand, f.source, f.sourceRef, f.unit, f.kcalPer100, f.proteinPer100, f.carbsPer100, f.fatPer100, f.fiberPer100, f.servingName, f.servingQuantity].map(lit).join(", ")})`,
);
const sql = rows.length
  ? `-- Généré par scripts/import-foods.ts — ne pas modifier à la main.
insert into public.foods (id, owner_id, name, brand, source, source_ref, unit, kcal_per100, protein_per100, carbs_per100, fat_per100, fiber_per100, serving_name, serving_quantity) values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name, kcal_per100 = excluded.kcal_per100, protein_per100 = excluded.protein_per100,
  carbs_per100 = excluded.carbs_per100, fat_per100 = excluded.fat_per100, fiber_per100 = excluded.fiber_per100;
`
  : "-- Aucun aliment importé.\n";
writeFileSync(resolve(root, "supabase/migrations/20261125000003_foods_seed.sql"), sql);

console.log(`✓ ${result.foods.length} aliments importés, ${result.approximated} avec « traces » / « < seuil » ramenés à 0.`);
if (result.rejected.length) {
  console.log(`✗ ${result.rejected.length} lignes rejetées :`);
  for (const r of result.rejected.slice(0, 20)) console.log(`  ligne ${r.line} : ${r.reason}`);
}
