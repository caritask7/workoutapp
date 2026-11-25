"use client";

import { Timer } from "lucide-react";
import { Button, ProgressRing } from "@/components/ui";
import { formatClock } from "@/lib/format";

/** Minuteur de repos (active.png) : anneau, +30 s, Passer. */
export function RestTimer({
  remainingSec,
  totalSec,
  plannedSec,
  onAdd,
  onSkip,
  onStart,
  disabled,
}: {
  remainingSec: number | null;
  totalSec: number;
  plannedSec: number;
  onAdd: () => void;
  onSkip: () => void;
  onStart: () => void;
  disabled?: boolean;
}) {
  const running = remainingSec !== null && remainingSec > 0;
  return (
    <div className={running ? "flex items-center gap-4 rounded-card border border-rest/30 bg-surface-2 p-3.5" : "flex items-center gap-4 rounded-card bg-surface-2 p-3.5"}>
      <ProgressRing value={running ? (remainingSec / Math.max(1, totalSec)) * 100 : 0} size={60} stroke={6} color={running ? "rest" : "lime"} label="Temps de repos restant">
        <Timer className={running ? "size-5 text-rest" : "size-5 text-lime"} aria-hidden />
      </ProgressRing>
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-label-caps text-muted">{running ? "Temps de repos" : "Repos prévu"}</p>
        <p className="text-metric-lg text-ink-strong">{formatClock(running ? remainingSec : plannedSec)}</p>
      </div>
      {running ? (
        <div className="flex gap-2">
          <Button size="sm" variant="subtle" onClick={onAdd} disabled={disabled} aria-label="Ajouter 30 secondes de repos">
            +30s
          </Button>
          <Button size="sm" variant="subtle" onClick={onSkip} disabled={disabled}>
            Passer
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="subtle" onClick={onStart} disabled={disabled}>
          Lancer
        </Button>
      )}
    </div>
  );
}
