"use client";

import type { ReactNode } from "react";
import { ErrorState } from "@/components/ui";
import { useDataContext } from "./data-provider";

/**
 * Affiche l'erreur d'initialisation de la couche de données. Pendant le
 * chargement, les écrans sont rendus (coquille statique / navigation
 * instantanée) et affichent leurs propres squelettes via `useData`.
 */
export function DataGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useDataContext();

  if (status === "error") {
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
        <ErrorState message={error ?? "Initialisation impossible."} onRetry={retry} />
      </div>
    );
  }

  return <>{children}</>;
}
