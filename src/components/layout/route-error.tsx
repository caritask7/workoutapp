"use client";

import { useEffect } from "react";
import { TriangleExclamationPoint } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";

/** Écran d'erreur commun aux segments (error.tsx). */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <TriangleExclamationPoint className="size-10 text-danger-soft" aria-hidden />
      <h1 className="text-headline-md text-ink-strong">Une erreur est survenue</h1>
      <p className="text-[14px] text-muted">Vos données enregistrées ne sont pas affectées. Réessayez ou revenez à l&apos;accueil.</p>
      <div className="flex gap-3">
        <Button onClick={() => retry()}>Réessayer</Button>
        <ButtonLink href="/" variant="secondary">
          Accueil
        </ButtonLink>
      </div>
    </div>
  );
}
