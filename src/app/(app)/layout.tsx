import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui";
import { DataGate } from "@/providers/data-gate";
import { DataProvider } from "@/providers/data-provider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <DataProvider>
      <ToastProvider>
        <DataGate>
          <AppShell>{children}</AppShell>
        </DataGate>
      </ToastProvider>
    </DataProvider>
  );
}
