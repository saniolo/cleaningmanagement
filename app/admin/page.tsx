import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={admin ? `Bentornato, ${admin.email}.` : "Riepilogo operativo della settimana."}
      />
      <EmptyState
        title="Nessun dato disponibile."
        description="Il riepilogo verrà popolato una volta introdotti dipendenti, pianificazione e assenze (Milestone 2+)."
      />
    </div>
  );
}
