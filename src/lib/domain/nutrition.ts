import type { Food, Macros, NutritionGoal } from "@/types/domain";
import { round } from "./training";

export const ZERO_MACROS: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/** Apports pour une quantité donnée (g ou ml), à partir des valeurs pour 100. */
export function macrosForQuantity(
  food: Pick<Food, "kcalPer100" | "proteinPer100" | "carbsPer100" | "fatPer100">,
  quantity: number,
): Macros {
  const f = Math.max(0, quantity) / 100;
  return {
    kcal: round(food.kcalPer100 * f, 0),
    proteinG: round(food.proteinPer100 * f, 1),
    carbsG: round(food.carbsPer100 * f, 1),
    fatG: round(food.fatPer100 * f, 1),
  };
}

export function sumMacros(items: Macros[]): Macros {
  const total = items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    ZERO_MACROS,
  );
  return {
    kcal: round(total.kcal, 0),
    proteinG: round(total.proteinG, 1),
    carbsG: round(total.carbsG, 1),
    fatG: round(total.fatG, 1),
  };
}

/** Pourcentage atteint (non borné, arrondi à l'entier). */
export function percentOf(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

export interface MacroProgress {
  key: "proteinG" | "carbsG" | "fatG";
  label: string;
  value: number;
  target: number;
  percent: number;
}

export function macroProgress(totals: Macros, goal: Pick<NutritionGoal, "proteinG" | "carbsG" | "fatG">): MacroProgress[] {
  return [
    { key: "proteinG", label: "Protéines", value: totals.proteinG, target: goal.proteinG, percent: percentOf(totals.proteinG, goal.proteinG) },
    { key: "carbsG", label: "Glucides", value: totals.carbsG, target: goal.carbsG, percent: percentOf(totals.carbsG, goal.carbsG) },
    { key: "fatG", label: "Lipides", value: totals.fatG, target: goal.fatG, percent: percentOf(totals.fatG, goal.fatG) },
  ];
}

/**
 * Cohérence énergétique d'un aliment saisi (facteurs d'Atwater 4/4/9).
 * Renvoie l'écart relatif entre kcal déclarées et kcal calculées.
 */
export function atwaterDeviation(
  food: Pick<Food, "kcalPer100" | "proteinPer100" | "carbsPer100" | "fatPer100">,
): number {
  const computed = food.proteinPer100 * 4 + food.carbsPer100 * 4 + food.fatPer100 * 9;
  if (food.kcalPer100 <= 0) return computed > 0 ? 1 : 0;
  return Math.abs(computed - food.kcalPer100) / food.kcalPer100;
}

/** Objectif applicable à une date (le plus récent dont `effectiveFrom` ≤ date). */
export function goalForDate<G extends Pick<NutritionGoal, "effectiveFrom">>(goals: G[], date: string): G | null {
  return (
    [...goals]
      .filter((g) => g.effectiveFrom <= date)
      .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0] ?? null
  );
}
