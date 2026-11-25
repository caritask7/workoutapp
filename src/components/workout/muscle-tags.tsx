import { Tag } from "@/components/ui";
import { MUSCLE_BY_ID } from "@/data/seed/muscles";
import type { MuscleId } from "@/types/domain";

/** Étiquettes de groupes musculaires (noms courts). */
export function MuscleTags({ muscles, max = 6, className }: { muscles: string[]; max?: number; className?: string }) {
  const shown = muscles.slice(0, max);
  const rest = muscles.length - shown.length;
  return (
    <ul className={className ?? "flex flex-wrap gap-2"}>
      {shown.map((m) => (
        <li key={m}>
          <Tag>{MUSCLE_BY_ID[m as MuscleId]?.shortName ?? m}</Tag>
        </li>
      ))}
      {rest > 0 && (
        <li>
          <Tag className="text-muted">+{rest}</Tag>
        </li>
      )}
    </ul>
  );
}

/** Étiquettes compactes en capitales (cartes de la liste Workouts). */
export function MuscleCaps({ muscles, max = 4 }: { muscles: string[]; max?: number }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {muscles.slice(0, max).map((m) => (
        <li key={m} className="rounded-md bg-surface-3 px-2 py-1 text-[10.5px] font-display font-semibold uppercase tracking-[0.06em] text-ink">
          {MUSCLE_BY_ID[m as MuscleId]?.shortName ?? m}
        </li>
      ))}
    </ul>
  );
}
