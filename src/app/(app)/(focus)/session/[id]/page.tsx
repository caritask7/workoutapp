import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSkeleton } from "@/components/ui";
import { SessionScreen } from "@/components/screens/session-screen";

export const metadata: Metadata = { title: "Séance active" };

export default function Page({ params }: PageProps<"/session/[id]">) {
  return (
    <Suspense fallback={<div className="p-4"><PageSkeleton blocks={3} /></div>}>
      {params.then(({ id }) => <SessionScreen id={id} />)}
    </Suspense>
  );
}
