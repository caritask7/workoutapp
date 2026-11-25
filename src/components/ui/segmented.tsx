"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/**
 * Contrôle segmenté : périodes (7J / 30J…) ou vue face / dos.
 * Implémenté en groupe de boutons radio (navigation clavier native).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-[18px] border border-line/70 bg-surface p-1.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl font-display font-semibold uppercase tracking-[0.06em] transition-colors",
              size === "lg" ? "h-12 text-[12px]" : "h-9 text-[11px]",
              active ? "bg-lime text-on-lime shadow-[0_0_18px_rgba(163,250,0,0.3)]" : "text-muted hover:text-ink-strong",
            )}
          >
            {o.icon && <span className="[&>svg]:size-4">{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
