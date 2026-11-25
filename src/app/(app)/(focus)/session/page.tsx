"use client";

import { WithIdParam } from "@/components/layout/with-id-param";
import { SessionScreen } from "@/components/screens/session-screen";

export default function Page() {
  return <WithIdParam render={(id) => <SessionScreen key={id} id={id} />} />;
}
