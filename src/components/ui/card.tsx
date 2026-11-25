import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardTone = "default" | "raised" | "active" | "inset";

const tones: Record<CardTone, string> = {
  /* Layer 1 : surface + filet */
  default: "bg-surface border border-line/70",
  /* Carte mise en avant (« Aujourd'hui ») : dégradé lime discret */
  raised: "border border-line-strong bg-[radial-gradient(120%_80%_at_100%_0%,rgba(163,250,0,0.10),transparent_55%),linear-gradient(180deg,#232426,#1b1c1e)]",
  /* Élément actif : filet lime + halo */
  active: "bg-surface border border-lime/70 glow-lime",
  /* Bloc incrusté dans une carte */
  inset: "bg-surface-lowest/70 border border-line/60",
};

export interface CardProps extends ComponentProps<"section"> {
  tone?: CardTone;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };

export function Card({ tone = "default", padding = "lg", className, ...rest }: CardProps) {
  return <section className={cn("rounded-card-lg", tones[tone], paddings[padding], className)} {...rest} />;
}

/** En-tête de carte : label en capitales avec icône, et zone d'action à droite. */
export function CardHeader({
  icon,
  title,
  aside,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <h2 className="flex min-w-0 items-center gap-2 text-label-caps text-ink">
        {icon && <span className="shrink-0 text-lime [&>svg]:size-4">{icon}</span>}
        <span className="min-w-0">{title}</span>
      </h2>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Titre de section hors carte (« Volume & Records Personnels »). */
export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="text-headline-sm text-ink-strong">{children}</h2>
      {aside && <div className="shrink-0 text-label-caps text-lime">{aside}</div>}
    </div>
  );
}
