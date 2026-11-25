import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSkeleton } from "@/components/ui";
import { NewWorkoutScreen } from "@/components/screens/workout-form-screens";

export const metadata: Metadata = { title: "Nouvel entraînement" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton blocks={3} />}>
      <NewWorkoutScreen />
    </Suspense>
  );
}
