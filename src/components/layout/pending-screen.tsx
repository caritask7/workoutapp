import { Construction } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

/**
 * Écran dont l'intégration est planifiée (phase 3). Affiché explicitement
 * plutôt qu'une maquette factice.
 */
export function PendingScreen({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-headline-lg text-ink-strong">{title}</h1>
      <EmptyState
        icon={<Construction />}
        title="Écran en cours d'intégration"
        action={
          <ButtonLink href="/design-system" variant="secondary" size="md">
            Voir le design system
          </ButtonLink>
        }
      >
        Les fondations (données, design system, navigation) sont en place. Cet écran est intégré à l&apos;étape suivante.
      </EmptyState>
    </div>
  );
}
