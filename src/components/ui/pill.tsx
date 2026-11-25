import type { ComponentProps, ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type PillTone = "neutral" | "lime" | "lime-soft" | "dark" | "outline" | "danger";

const tones: Record<PillTone, string> = {
  neutral: "bg-surface-3 text-muted",
  lime: "bg-lime text-on-lime",
  "lime-soft": "bg-lime/12 text-lime",
  dark: "bg-surface-lowest text-ink-strong",
  outline: "border border-line-strong text-muted",
  danger: "bg-danger/15 text-danger-soft",
};

export interface PillProps extends ComponentProps<"span"> {
  tone?: PillTone;
  icon?: ReactNode;
  caps?: boolean;
}

/** Pastille d'information (statut, delta, badge PR). */
export function Pill({ tone = "neutral", icon, caps, className, children, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 tabular",
        caps ? "text-label-caps" : "text-label-badge",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon && <span className="[&>svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  );
}

/** Étiquette de groupe musculaire (fond noir, cf. carte « Aujourd'hui »). */
export function Tag({ className, ...rest }: ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex h-7 items-center rounded-lg bg-surface-lowest px-2.5 text-[13px] text-ink-strong", className)}
      {...rest}
    />
  );
}

export interface ChipProps extends Omit<ComponentProps<"button">, "onChange"> {
  selected: boolean;
  onToggle?: () => void;
}

/** Puce sélectionnable (muscle selector) : coche quand active, « + » sinon. */
export function Chip({ selected, onToggle, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-label-caps transition-colors active:scale-95",
        selected ? "bg-lime text-on-lime" : "bg-surface-3 text-ink hover:bg-surface-4",
        className,
      )}
      {...rest}
    >
      {selected ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <Plus className="size-3.5 text-lime" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  );
}

/** Point de statut lumineux (pulsant si `live`). */
export function StatusDot({ live, className }: { live?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full bg-lime shadow-[0_0_8px_rgba(163,250,0,0.8)]", live && "animate-pulse-dot", className)}
    />
  );
}
