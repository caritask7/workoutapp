"use client";

import { Check, CheckCheck, Trash2 } from "lucide-react";
import { IconButton, NumberInput } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDecimal } from "@/lib/format";
import type { SessionPlanItem, WorkoutSet } from "@/types/domain";

export type RowState = "done" | "current" | "upcoming";

function previousLabel(prev: WorkoutSet | undefined, item: SessionPlanItem) {
  if (!prev) return null;
  if (item.trackingType === "duration") return `${prev.durationSec ?? "—"} s`;
  if (item.trackingType === "reps") return `${prev.reps ?? "—"} reps`;
  return `${prev.weightKg != null ? formatDecimal(prev.weightKg) : "—"} × ${prev.reps ?? "—"}`;
}

function targetLabel(item: SessionPlanItem) {
  if (item.trackingType === "duration") {
    return item.durationMinSec === item.durationMaxSec ? `${item.durationMinSec}s` : `${item.durationMinSec}-${item.durationMaxSec}s`;
  }
  return item.repsMin === item.repsMax ? `${item.repsMin}` : `${item.repsMin}-${item.repsMax}`;
}

/** Ligne de série (DESIGN.md › Set Table Rows) : précédent, charge, reps, validation. */
export function SetRow({
  set,
  item,
  previous,
  state,
  onChange,
  onToggle,
  onRemove,
  disabled,
}: {
  set: WorkoutSet;
  item: SessionPlanItem;
  previous?: WorkoutSet;
  state: RowState;
  onChange: (patch: Partial<Pick<WorkoutSet, "weightKg" | "reps" | "durationSec">>) => void;
  onToggle: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const weighted = item.trackingType === "weight_reps";
  const duration = item.trackingType === "duration";
  const prev = previousLabel(previous, item);

  return (
    <li
      className={cn(
        "relative grid items-center gap-1.5 rounded-2xl px-2.5 py-2.5 transition-colors",
        weighted ? "grid-cols-[20px_minmax(0,1fr)_minmax(60px,84px)_minmax(48px,64px)_56px]" : "grid-cols-[20px_minmax(0,1fr)_minmax(64px,96px)_56px]",
        state === "done" && "bg-lime/8",
        state === "current" && "bg-surface-3 before:absolute before:inset-y-3 before:-left-1 before:w-1 before:rounded-full before:bg-lime",
        state === "upcoming" && "opacity-60 focus-within:opacity-100",
      )}
    >
      <span className={cn("font-display text-[18px] font-bold tabular", state === "upcoming" ? "text-muted" : "text-lime")}>{set.setNumber}</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[14px] text-ink-strong tabular">{prev ?? "—"}</span>
        <span className={cn("block truncate text-[11px] font-display font-semibold uppercase tracking-[0.06em]", state === "current" ? "text-lime" : "text-subtle")}>
          {state === "current" ? `Obj. ${targetLabel(item)}` : prev ? "Préc." : `Obj. ${targetLabel(item)}`}
        </span>
      </span>
      {weighted && (
        <NumberInput
          variant="cell"
          decimals={2}
          value={set.weightKg}
          onValueChange={(v) => onChange({ weightKg: v })}
          aria-label={`Charge série ${set.setNumber} (kg)`}
          placeholder="kg"
          disabled={disabled}
        />
      )}
      {duration ? (
        <NumberInput
          variant="cell"
          value={set.durationSec}
          onValueChange={(v) => onChange({ durationSec: v })}
          aria-label={`Durée série ${set.setNumber} (secondes)`}
          placeholder="s"
          disabled={disabled}
        />
      ) : (
        <NumberInput
          variant="cell"
          value={set.reps}
          onValueChange={(v) => onChange({ reps: v })}
          aria-label={`Répétitions série ${set.setNumber}`}
          placeholder="reps"
          disabled={disabled}
        />
      )}
      <div className="flex justify-end">
        {state === "done" ? (
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-label={`Série ${set.setNumber} validée — annuler la validation`}
            className="grid size-14 w-full place-items-center rounded-2xl bg-lime text-on-lime transition-transform active:scale-95"
          >
            <Check className="size-6" strokeWidth={3} />
          </button>
        ) : state === "current" ? (
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-label={`Valider la série ${set.setNumber}`}
            className="grid h-14 w-full place-items-center rounded-2xl bg-lime font-display text-[13px] font-bold text-on-lime glow-lime-strong transition-transform active:scale-95"
          >
            <span className="flex items-center gap-1">
              <CheckCheck className="size-4" aria-hidden />
              LOG
            </span>
          </button>
        ) : onRemove ? (
          <IconButton label={`Supprimer la série ${set.setNumber}`} variant="ghost" size="lg" onClick={onRemove} disabled={disabled}>
            <Trash2 className="size-5 text-subtle" />
          </IconButton>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-label={`Valider la série ${set.setNumber}`}
            className="grid size-14 place-items-center rounded-2xl border border-line-strong text-subtle"
          >
            <Check className="size-5" />
          </button>
        )}
      </div>
    </li>
  );
}
