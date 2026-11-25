import { cn } from "@/lib/cn";

/**
 * Logotype WORKOUT. Le logo des maquettes n'était pas fourni (image cassée) :
 * logotype typographique dans l'identité Kinetic Obsidian.
 */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold tracking-[-0.02em] text-ink-strong", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#a3fa00" />
        <path d="M7 10.5 10.4 22h2.1L16 13.2 19.5 22h2.1L25 10.5h-2.6l-2.1 7.6-3.2-7.6h-2.2l-3.2 7.6-2.1-7.6Z" fill="#112000" />
      </svg>
      {!compact && <span className="text-[19px] leading-none">WORKOUT</span>}
    </span>
  );
}
