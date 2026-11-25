import type { Metadata } from "next";
import { HistoryScreen } from "@/components/screens/history-screen";

export const metadata: Metadata = { title: "Historique" };

export default function Page() {
  return <HistoryScreen />;
}
