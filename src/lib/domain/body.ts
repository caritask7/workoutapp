import type { BodyMeasurement } from "@/types/domain";
import { round } from "./training";

export type MeasurementField = "weightKg" | "chestCm" | "armCm" | "waistCm" | "thighCm" | "bodyFatPct";

/** Dernière valeur renseignée d'un champ (mesures triées peu importe l'ordre). */
export function latestValue(
  measurements: BodyMeasurement[],
  field: MeasurementField,
): { value: number; date: string } | null {
  let best: { value: number; date: string } | null = null;
  for (const m of measurements) {
    const v = m[field];
    if (v === null || v === undefined) continue;
    if (!best || m.date > best.date) best = { value: v, date: m.date };
  }
  return best;
}

/** Première valeur renseignée d'un champ à partir d'une date (incluse). */
export function earliestValue(
  measurements: BodyMeasurement[],
  field: MeasurementField,
  fromDate?: string,
): { value: number; date: string } | null {
  let best: { value: number; date: string } | null = null;
  for (const m of measurements) {
    const v = m[field];
    if (v === null || v === undefined) continue;
    if (fromDate && m.date < fromDate) continue;
    if (!best || m.date < best.date) best = { value: v, date: m.date };
  }
  return best;
}

/**
 * Progression vers l'objectif de poids, en %, bornée à [0, 100].
 * L'objectif retenu est le bas de la fourchette cible.
 */
export function weightGoalProgress(startKg: number, currentKg: number, targetKg: number): number {
  const span = targetKg - startKg;
  if (span === 0) return 100;
  const pct = ((currentKg - startKg) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function delta(a: number | null | undefined, b: number | null | undefined, decimals = 1): number | null {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return round(b - a, decimals);
}
