import type { Food, FoodSource, FoodUnit } from "@/types/domain";

/**
 * Import d'aliments de référence depuis un CSV (ex. export de la table
 * CIQUAL de l'ANSES). Colonnes attendues (en-têtes, ordre libre, insensibles
 * à la casse) :
 *   nom, kcal, proteines, glucides, lipides, [fibres], [source], [ref], [unite]
 * Séparateur « ; » ou « , », décimales « , » ou « . ».
 * Les mentions « traces » et « < x » sont importées comme 0 et comptées dans
 * `approximated` ; une valeur absente ou « - » sur une macro obligatoire
 * rejette la ligne (aucune valeur n'est inventée).
 */
export interface FoodCsvResult {
  foods: Omit<Food, "createdAt">[];
  rejected: { line: number; reason: string }[];
  approximated: number;
}

const ALIASES: Record<string, string[]> = {
  name: ["nom", "name", "alim_nom_fr", "aliment"],
  kcal: ["kcal", "energie", "énergie", "energie_kcal", "energy_kcal"],
  protein: ["proteines", "protéines", "protein", "proteines_g"],
  carbs: ["glucides", "carbs", "glucides_g"],
  fat: ["lipides", "fat", "lipides_g"],
  fiber: ["fibres", "fiber", "fibres_g"],
  source: ["source"],
  ref: ["ref", "code", "alim_code", "source_ref"],
  unit: ["unite", "unité", "unit"],
};

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

type Parsed = { value: number; approx: boolean } | null;

export function parseNutrient(raw: string | undefined): Parsed {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || v === "-" || v === "nd" || v === "n/a") return null;
  if (v === "traces" || v === "trace") return { value: 0, approx: true };
  if (v.startsWith("<")) return { value: 0, approx: true };
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? { value: n, approx: false } : null;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

export function parseFoodsCsv(text: string, defaults: { source?: FoodSource } = {}): FoodCsvResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const result: FoodCsvResult = { foods: [], rejected: [], approximated: 0 };
  if (lines.length < 2) return result;
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const col = (key: string) => headers.findIndex((h) => ALIASES[key].includes(h));
  const idx = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, col(k)]));
  for (const required of ["name", "kcal", "protein", "carbs", "fat"]) {
    if (idx[required] < 0) throw new Error(`Colonne obligatoire absente : ${ALIASES[required][0]}`);
  }

  const seen = new Set<string>();
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line, sep);
    const get = (k: string) => (idx[k] >= 0 ? cells[idx[k]] : undefined);
    const name = get("name")?.trim();
    const lineNo = i + 2;
    if (!name) return result.rejected.push({ line: lineNo, reason: "nom manquant" });
    const values = {
      kcal: parseNutrient(get("kcal")),
      protein: parseNutrient(get("protein")),
      carbs: parseNutrient(get("carbs")),
      fat: parseNutrient(get("fat")),
    };
    const missing = Object.entries(values).find(([, v]) => v === null);
    if (missing) return result.rejected.push({ line: lineNo, reason: `${missing[0]} non renseigné` });
    const p = values.protein!.value;
    const c = values.carbs!.value;
    const f = values.fat!.value;
    if (p + c + f > 100 || values.kcal!.value > 900) return result.rejected.push({ line: lineNo, reason: "valeurs incohérentes" });
    if (Object.values(values).some((v) => v!.approx)) result.approximated++;
    const fiber = parseNutrient(get("fiber"));
    const source = (get("source")?.toLowerCase() as FoodSource) || defaults.source || "ciqual";
    const ref = get("ref") ?? "";
    const id = `${source === "ciqual" ? "ciqual" : "ref"}:${ref || slug(name)}`;
    if (seen.has(id)) return result.rejected.push({ line: lineNo, reason: "doublon" });
    seen.add(id);
    result.foods.push({
      id,
      ownerId: null,
      name: name.slice(0, 80),
      brand: "",
      source: ["user", "ciqual", "label"].includes(source) ? source : "ciqual",
      sourceRef: ref,
      unit: (get("unit")?.toLowerCase() === "ml" ? "ml" : "g") as FoodUnit,
      kcalPer100: values.kcal!.value,
      proteinPer100: p,
      carbsPer100: c,
      fatPer100: f,
      fiberPer100: fiber?.value ?? null,
      servingName: "",
      servingQuantity: null,
    });
  });
  return result;
}
