"use client";

import { WithIdParam } from "@/components/layout/with-id-param";
import { ExerciseDetailScreen } from "@/components/screens/exercise-detail-screen";

export default function Page() {
  return <WithIdParam render={(id) => <ExerciseDetailScreen key={id} id={id} />} />;
}
