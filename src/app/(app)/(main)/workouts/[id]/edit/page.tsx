import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { EditWorkoutScreen } from "@/components/screens/workout-form-screens";

export default function Page({ params }: PageProps<"/workouts/[id]/edit">) {
  return <Suspense fallback={<PageSkeleton blocks={3} />}>{params.then(({ id }) => <EditWorkoutScreen id={id} />)}</Suspense>;
}
