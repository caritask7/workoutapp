"use client";

import { WithIdParam } from "@/components/layout/with-id-param";
import { WorkoutDetailScreen } from "@/components/screens/workout-detail-screen";

export default function Page() {
  return <WithIdParam render={(id) => <WorkoutDetailScreen key={id} id={id} />} />;
}
