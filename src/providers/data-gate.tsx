"use client";

import type { ReactNode } from "react";
import { ErrorState, Logo } from "@/components/ui";
import { useDataContext } from "./data-provider";

/** Bloque le rendu tant que la couche de données n'est pas initialisée. */
export function DataGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useDataContext();

  if (status === "loading") {
    return (
      <div role="status" className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Logo className="animate-pulse" />
          <span className="text-label-caps text-subtle">Chargement des données…</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
        <ErrorState message={error ?? "Initialisation impossible."} onRetry={retry} />
      </div>
    );
  }

  return <>{children}</>;
}
