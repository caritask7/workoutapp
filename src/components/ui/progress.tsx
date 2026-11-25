import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export interface ProgressBarProps {
  /** Pourcentage 0–100 (borné). */
  value: number;
  color?: "lime" | "carbs" | "fat" | "muted" | "rest";
  size?: "xs" | "sm" | "md";
  label?: string;
  className?: string;
}

const fills = {
  lime: "bg-lime shadow-[0_0_10px_rgba(163,250,0,0.35)]",
  carbs: "bg-carbs",
  fat: "bg-fat",
  muted: "bg-subtle",
  rest: "bg-rest",
};
const heights = { xs: "h-1", sm: "h-1.5", md: "h-2.5" };

export function ProgressBar({ value, color = "lime", size = "md", label, className }: ProgressBarProps) {
  const v = clamp(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", heights[size], className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fills[color])} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Barre segmentée (ex. tonnage par séance de la semaine). */
export function SegmentedBar({ segments, className }: { segments: { value: number; tone: "done" | "planned" | "empty" }[]; className?: string }) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {segments.map((s, i) => (
        <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("h-full rounded-full", s.tone === "done" ? "bg-lime" : s.tone === "planned" ? "bg-lime/35" : "bg-transparent")}
            style={{ width: `${clamp(s.value)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: "lime" | "rest";
  label?: string;
  children?: ReactNode;
  className?: string;
}

/** Jauge circulaire SVG (DESIGN.md › Sleek Progress Rings). */
export function ProgressRing({ value, size = 120, stroke = 10, color = "lime", label, children, className }: ProgressRingProps) {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(v)} %`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color === "lime" ? "var(--color-lime)" : "var(--color-rest)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color === "lime" ? "rgba(163,250,0,0.45)" : "rgba(0,229,255,0.45)"})` }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
