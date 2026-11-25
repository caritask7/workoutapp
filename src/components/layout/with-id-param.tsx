"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, ErrorState, PageSkeleton } from "@/components/ui";

function Reader({ render }: { render: (id: string) => ReactNode }) {
  const id = useSearchParams().get("id");
  if (!id) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <ErrorState message="Lien incomplet : identifiant manquant." />
        <ButtonLink href="/">Accueil</ButtonLink>
      </div>
    );
  }
  return <>{render(id)}</>;
}

/** Lit `?id=` (sous <Suspense>, compatible export statique) et rend l'écran. */
export function WithIdParam({ render }: { render: (id: string) => ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton blocks={3} />}>
      <Reader render={render} />
    </Suspense>
  );
}
