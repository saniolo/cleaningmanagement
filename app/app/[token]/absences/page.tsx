import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function EmployeeAbsencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Assenze" />
      <EmptyState
        title="Nessuna richiesta di assenza inviata."
        description="Disponibile a partire dalla Milestone 6."
      />
    </div>
  );
}
