import { Ruler, Timer } from "lucide-react";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Equipment, MovementPattern } from "@/types/domain";
import { EQUIPMENT_LABEL } from "./exercise-picker";

export const PATTERN_LABEL: Record<MovementPattern, string> = {
  squat: "Flexion de jambes",
  hinge: "Charnière de hanche",
  leg_press: "Poussée de jambes",
  hip_thrust: "Extension de hanche",
  leg_curl: "Flexion du genou",
  calf_raise: "Extension de cheville",
  horizontal_push: "Poussée horizontale",
  incline_push: "Poussée inclinée 30°",
  vertical_push: "Poussée verticale",
  horizontal_pull: "Tirage horizontal",
  vertical_pull: "Tirage vertical",
  lateral_raise: "Abduction d'épaule",
  elbow_flexion: "Flexion du coude",
  elbow_extension: "Extension du coude",
  core_flexion: "Enroulement du tronc",
  core_isometric: "Gainage isométrique",
};

type Kind = "vertical" | "horizontal" | "incline" | "arc" | "hold";

const KIND: Record<MovementPattern, Kind> = {
  squat: "vertical",
  hinge: "vertical",
  leg_press: "incline",
  hip_thrust: "vertical",
  leg_curl: "arc",
  calf_raise: "vertical",
  horizontal_push: "horizontal",
  incline_push: "incline",
  vertical_push: "vertical",
  horizontal_pull: "horizontal",
  vertical_pull: "vertical",
  lateral_raise: "arc",
  elbow_flexion: "arc",
  elbow_extension: "arc",
  core_flexion: "arc",
  core_isometric: "hold",
};

/** Glyphe du matériel (barre, haltère, poulie…), centré sur (x, y). */
function Implement({ equipment, x, y, rotate = 0 }: { equipment: Equipment; x: number; y: number; rotate?: number }) {
  const t = `translate(${x} ${y}) rotate(${rotate})`;
  if (equipment === "cable") {
    return (
      <g transform={t} fill="none" stroke="#e3e2e5" strokeWidth={3} strokeLinecap="round">
        <line x1={0} y1={-40} x2={0} y2={-8} strokeDasharray="4 4" />
        <rect x={-14} y={-8} width={28} height={10} rx={4} fill="#e3e2e5" stroke="none" />
      </g>
    );
  }
  if (equipment === "bodyweight") {
    return (
      <g transform={t} fill="#e3e2e5">
        <circle cx={0} cy={-14} r={7} />
        <rect x={-5} y={-5} width={10} height={20} rx={5} />
      </g>
    );
  }
  const wide = equipment === "barbell" || equipment === "machine";
  return (
    <g transform={t}>
      <rect x={wide ? -30 : -14} y={-2} width={wide ? 60 : 28} height={4} rx={2} fill="#c7c6ce" />
      <rect x={wide ? -34 : -18} y={-12} width={9} height={24} rx={3} fill="#e3e2e5" />
      <rect x={wide ? 25 : 9} y={-12} width={9} height={24} rx={3} fill="#e3e2e5" />
    </g>
  );
}

const ARROW = "#a3fa00";

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = (a: number) => `${x2 - 9 * Math.cos(angle - a)},${y2 - 9 * Math.sin(angle - a)}`;
  return (
    <g stroke={ARROW} strokeWidth={2.5} strokeLinecap="round" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={`${head(0.5)} ${x2},${y2} ${head(-0.5)}`} />
    </g>
  );
}

/**
 * Schéma d'exécution par famille de mouvement (style active.png) :
 * trajectoire lime, matériel stylisé, repère de repos.
 */
export function ExerciseDiagram({
  pattern,
  equipment,
  restSec,
  className,
}: {
  pattern: MovementPattern;
  equipment: Equipment;
  restSec?: number;
  className?: string;
}) {
  const kind = KIND[pattern];
  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-card border border-line/60 bg-surface-lowest bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:24px_24px]",
        className,
      )}
    >
      <svg viewBox="0 0 320 170" className="block h-auto w-full" role="img" aria-label={`Schéma : ${PATTERN_LABEL[pattern]}`}>
        <line x1={50} y1={142} x2={270} y2={142} stroke="#343537" strokeWidth={6} strokeLinecap="round" />
        {kind === "vertical" && (
          <>
            <Implement equipment={equipment} x={160} y={60} />
            <Arrow x1={210} y1={120} x2={210} y2={40} />
            <Arrow x1={110} y1={40} x2={110} y2={120} />
          </>
        )}
        {kind === "horizontal" && (
          <>
            <Implement equipment={equipment} x={160} y={90} rotate={pattern === "horizontal_pull" ? 90 : 0} />
            <Arrow x1={pattern === "horizontal_pull" ? 250 : 90} y1={50} x2={pattern === "horizontal_pull" ? 90 : 250} y2={50} />
          </>
        )}
        {kind === "incline" && (
          <>
            <line x1={70} y1={130} x2={250} y2={58} stroke={ARROW} strokeWidth={6} strokeLinecap="round" />
            <path d="M120 130 A 50 50 0 0 0 116 112" fill="none" stroke={ARROW} strokeWidth={2} strokeDasharray="3 4" />
            <text x={130} y={124} fill={ARROW} fontSize={12} fontFamily="var(--font-space-grotesk)" fontWeight={700}>
              30°
            </text>
            <Implement equipment={equipment} x={190} y={52} />
            <Arrow x1={190} y1={34} x2={190} y2={8} />
          </>
        )}
        {kind === "arc" && (
          <>
            <circle cx={160} cy={112} r={6} fill="#e3e2e5" />
            <line x1={160} y1={112} x2={92} y2={112} stroke="#c7c6ce" strokeWidth={5} strokeLinecap="round" />
            <path d="M92 112 A 68 68 0 0 1 160 44" fill="none" stroke={ARROW} strokeWidth={2.5} strokeDasharray="5 5" />
            <Arrow x1={152} y1={45} x2={160} y2={44} />
            <Implement equipment={equipment} x={160} y={40} rotate={90} />
          </>
        )}
        {kind === "hold" && (
          <>
            <line x1={80} y1={104} x2={240} y2={104} stroke={ARROW} strokeWidth={8} strokeLinecap="round" />
            <circle cx={252} cy={98} r={9} fill="#e3e2e5" />
            <line x1={100} y1={104} x2={100} y2={140} stroke="#c7c6ce" strokeWidth={5} strokeLinecap="round" />
            <line x1={226} y1={104} x2={232} y2={140} stroke="#c7c6ce" strokeWidth={5} strokeLinecap="round" />
            <text x={160} y={70} textAnchor="middle" fill={ARROW} fontSize={13} fontFamily="var(--font-space-grotesk)" fontWeight={700} letterSpacing="1">
              MAINTIEN
            </text>
          </>
        )}
      </svg>
      {restSec !== undefined && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2/90 px-2.5 py-1 text-label-caps text-ink">
          <Timer className="size-3.5 text-lime" aria-hidden />
          Repos {formatClock(restSec)}
        </span>
      )}
      <figcaption className="absolute bottom-3 left-3 inline-flex max-w-[calc(100%-24px)] items-center gap-2 truncate rounded-full border border-line-strong bg-surface-2/90 px-3 py-1.5 text-label-caps text-ink-strong">
        <Ruler className="size-3.5 shrink-0 text-lime" aria-hidden />
        {PATTERN_LABEL[pattern]} • {EQUIPMENT_LABEL[equipment]}
      </figcaption>
    </figure>
  );
}
