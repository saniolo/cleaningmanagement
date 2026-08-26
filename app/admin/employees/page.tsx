import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dipendenti"
        description="Anagrafica dipendenti e link personali di accesso."
      />
      <EmptyState
        title="Nessun dipendente presente."
        description="La gestione dipendenti arriva con la Milestone 2."
      />
    </div>
  );
}
