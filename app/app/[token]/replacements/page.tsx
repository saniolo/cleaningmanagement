import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function EmployeeReplacementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Richieste di sostituzione" />
      <EmptyState
        title="Nessuna sostituzione da confermare."
        description="Disponibile a partire dalla Milestone 7."
      />
    </div>
  );
}
