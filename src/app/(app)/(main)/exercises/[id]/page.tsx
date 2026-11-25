import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { ExerciseDetailScreen } from "@/components/screens/exercise-detail-screen";

export default function Page({ params }: PageProps<"/exercises/[id]">) {
  return <Suspense fallback={<PageSkeleton blocks={4} />}>{params.then(({ id }) => <ExerciseDetailScreen id={id} />)}</Suspense>;
}
