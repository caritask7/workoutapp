import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { WorkoutDetailScreen } from "@/components/screens/workout-detail-screen";

export default function Page({ params }: PageProps<"/workouts/[id]">) {
  return <Suspense fallback={<PageSkeleton blocks={3} />}>{params.then(({ id }) => <WorkoutDetailScreen id={id} />)}</Suspense>;
}
