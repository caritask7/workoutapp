import { ToastProvider } from "@/components/ui";
import { DataGate } from "@/providers/data-gate";
import { DataProvider } from "@/providers/data-provider";

/** Providers partagés : restent montés entre l'app et le mode entraînement. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider>
      <ToastProvider>
        <DataGate>{children}</DataGate>
      </ToastProvider>
    </DataProvider>
  );
}
