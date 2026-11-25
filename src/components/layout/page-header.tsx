import type { ReactNode } from "react";
import { StatusDot } from "@/components/ui";
import { cn } from "@/lib/cn";

/** En-tête d'écran : sur-titre lime avec point d'état, titre, sous-titre. */
export function PageHeader({
  eyebrow,
  aside,
  title,
  subtitle,
  className,
}: {
  eyebrow?: ReactNode;
  aside?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-1.5", className)}>
      {(eyebrow || aside) && (
        <div className="flex items-center justify-between gap-3">
          {eyebrow ? (
            <p className="flex items-center gap-2 text-label-caps text-lime">
              <StatusDot live />
              {eyebrow}
            </p>
          ) : (
            <span />
          )}
          {aside && <div className="text-label-caps text-muted">{aside}</div>}
        </div>
      )}
      <h1 className="text-headline-lg text-ink-strong">{title}</h1>
      {subtitle && <div className="text-[15px] text-muted">{subtitle}</div>}
    </header>
  );
}
