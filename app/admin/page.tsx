import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Riepilogo operativo della settimana." />
      <EmptyState
        title="Nessun dato disponibile."
        description="Il riepilogo verrà popolato una volta introdotti dipendenti, pianificazione e assenze (Milestone 2+)."
      />
    </div>
  );
}
