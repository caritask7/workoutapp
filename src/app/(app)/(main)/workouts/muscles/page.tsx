import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSkeleton } from "@/components/ui";
import { MuscleSelectorScreen } from "@/components/screens/muscle-selector-screen";

export const metadata: Metadata = { title: "Ciblage anatomique" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton blocks={3} />}>
      <MuscleSelectorScreen />
    </Suspense>
  );
}
