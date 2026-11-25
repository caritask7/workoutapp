import { BedDouble, Check, Dumbbell, X } from "lucide-react";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/domain/dates";
import { cn } from "@/lib/cn";
import type { WeekDay } from "@/services/insights";

const STATUS_LABEL = {
  done: "séance effectuée",
  extra: "séance supplémentaire effectuée",
  today: "séance prévue aujourd'hui",
  planned: "séance prévue",
  missed: "séance manquée",
  rest: "repos",
} as const;

/** Bande hebdomadaire (maquette home.png › SÉANCES HEBDO). */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const done = d.status === "done" || d.status === "extra";
        const today = d.status === "today";
        return (
          <li
            key={d.date}
            aria-label={`${WEEKDAY_LONG[d.weekday]} : ${STATUS_LABEL[d.status]}`}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border py-2.5",
              today ? "border-lime bg-lime/8 glow-lime" : "border-transparent",
            )}
          >
            <span className={cn("text-label-caps", today ? "text-lime" : d.status === "rest" ? "text-faint" : "text-muted")}>
              {WEEKDAY_SHORT[d.weekday]}
            </span>
            <span
              aria-hidden
              className={cn(
                "grid size-8 place-items-center rounded-lg",
                done && "bg-lime text-on-lime",
                today && "bg-lime/20 text-lime",
                d.status === "planned" && "border border-lime/40 text-lime",
                d.status === "missed" && "bg-surface-3 text-danger-soft",
                d.status === "rest" && "bg-surface-2 text-faint",
              )}
            >
              {done ? (
                <Check className="size-4" strokeWidth={3} />
              ) : d.status === "missed" ? (
                <X className="size-4" />
              ) : d.status === "rest" ? (
                <BedDouble className="size-4" />
              ) : (
                <Dumbbell className="size-4" />
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
