import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clienti e attività"
        description="Clienti, location e servizi di pulizia."
      />
      <EmptyState
        title="Nessun cliente presente."
        description="La gestione clienti/location/servizi arriva con la Milestone 2."
      />
    </div>
  );
}
