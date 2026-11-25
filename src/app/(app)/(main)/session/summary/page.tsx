"use client";

import { WithIdParam } from "@/components/layout/with-id-param";
import { SessionSummaryScreen } from "@/components/screens/session-summary-screen";

export default function Page() {
  return <WithIdParam render={(id) => <SessionSummaryScreen key={id} id={id} />} />;
}
