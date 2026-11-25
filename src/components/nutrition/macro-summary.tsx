import { LabelCaps, ProgressBar, ProgressRing } from "@/components/ui";
import { formatDecimal, formatInt } from "@/lib/format";
import { macroProgress, percentOf } from "@/lib/domain/nutrition";
import { cn } from "@/lib/cn";
import type { Macros, NutritionGoal } from "@/types/domain";

const COLORS = { proteinG: "lime", carbsG: "carbs", fatG: "fat" } as const;
const DOTS = { proteinG: "bg-lime", carbsG: "bg-carbs", fatG: "bg-fat" } as const;

export function CaloriesRing({ totals, goal, size = 132 }: { totals: Macros; goal: NutritionGoal; size?: number }) {
  return (
    <ProgressRing value={percentOf(totals.kcal, goal.calories)} size={size} stroke={12} label={`${totals.kcal} kcal sur ${goal.calories}`}>
      <div className="flex flex-col items-center">
        <span className="text-metric-lg text-ink-strong">{formatInt(totals.kcal)}</span>
        <span className="text-[12px] font-display font-semibold text-muted tabular">/ {formatInt(goal.calories)} kcal</span>
      </div>
    </ProgressRing>
  );
}

/** Barres de macros (home.png compact, nutrition.png détaillé). */
export function MacroBars({ totals, goal, detailed }: { totals: Macros; goal: NutritionGoal; detailed?: boolean }) {
  return (
    <ul className={cn("flex flex-col", detailed ? "gap-3" : "gap-4")}>
      {macroProgress(totals, goal).map((m) => (
        <li key={m.key} className={cn(detailed && "rounded-card bg-surface-2 px-3 py-3")}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className={cn("flex items-center gap-2", detailed ? "text-[15px] text-ink-strong" : "text-[13px] font-semibold text-ink-strong")}>
              {detailed && <span aria-hidden className={cn("size-2 rounded-full", DOTS[m.key])} />}
              {m.label}
              {!detailed && <span className="text-muted">({m.label[0]})</span>}
            </span>
            <span className="text-[13px] font-semibold text-ink-strong tabular">
              {formatDecimal(m.value)}g <span className="text-muted">/ {formatInt(m.target)}g</span>
              {detailed && <span className="ml-2 text-lime">{m.percent}%</span>}
            </span>
          </div>
          <ProgressBar value={m.percent} color={COLORS[m.key]} size={detailed ? "md" : "sm"} label={m.label} />
        </li>
      ))}
    </ul>
  );
}

export function RemainingKcal({ totals, goal }: { totals: Macros; goal: NutritionGoal }) {
  const remaining = goal.calories - totals.kcal;
  return (
    <LabelCaps className={remaining >= 0 ? "text-lime" : "text-danger-soft"}>
      {remaining >= 0 ? `${formatInt(remaining)} kcal restantes` : `${formatInt(-remaining)} kcal au-dessus`}
    </LabelCaps>
  );
}
