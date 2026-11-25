import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Valeur numérique + unité (DESIGN.md › hiérarchie entier blanc / unité grise). */
export function MetricValue({
  value,
  unit,
  size = "lg",
  className,
  unitClassName,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: "hero" | "xl" | "lg" | "md";
  className?: string;
  unitClassName?: string;
}) {
  const sizes = {
    hero: "text-display-hero tabular",
    xl: "text-metric-xl",
    lg: "text-metric-lg",
    md: "font-display text-[18px] font-bold leading-6 tabular",
  };
  return (
    <span className={cn("inline-flex items-baseline gap-1 text-ink-strong", className)}>
      <span className={sizes[size]}>{value}</span>
      {unit && <span className={cn("font-display text-[15px] font-semibold text-muted", unitClassName)}>{unit}</span>}
    </span>
  );
}

/** Tuile de statistique compacte (RECORDS, RATIO, etc.). */
export function StatCard({
  label,
  value,
  unit,
  hint,
  badge,
  accent,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  badge?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line/70 bg-surface-2 p-3.5", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-label-caps text-muted">{label}</span>
        {badge}
      </div>
      <MetricValue value={value} unit={unit} className={accent ? "[&>span:first-child]:text-lime" : undefined} />
      {hint && <div className="mt-1.5 text-[12px] font-semibold text-lime tabular">{hint}</div>}
    </div>
  );
}

/** Label en capitales (TARGET, OBJECTIF…). */
export function LabelCaps({ children, className, as: Tag = "span" }: { children: ReactNode; className?: string; as?: "span" | "p" | "h3" | "dt" }) {
  return <Tag className={cn("text-label-caps text-muted", className)}>{children}</Tag>;
}
