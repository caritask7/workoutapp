"use client";

import { WithIdParam } from "@/components/layout/with-id-param";
import { EditWorkoutScreen } from "@/components/screens/workout-form-screens";

export default function Page() {
  return <WithIdParam render={(id) => <EditWorkoutScreen key={id} id={id} />} />;
}
