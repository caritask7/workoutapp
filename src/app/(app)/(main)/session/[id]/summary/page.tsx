import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSkeleton } from "@/components/ui";
import { SessionSummaryScreen } from "@/components/screens/session-summary-screen";

export const metadata: Metadata = { title: "Récapitulatif de séance" };

export default function Page({ params }: PageProps<"/session/[id]/summary">) {
  return <Suspense fallback={<PageSkeleton blocks={3} />}>{params.then(({ id }) => <SessionSummaryScreen id={id} />)}</Suspense>;
}
