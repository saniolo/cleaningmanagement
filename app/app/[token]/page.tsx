import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function EmployeeWeekPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Questa settimana" />
      <EmptyState
        title="Nessuna attività programmata questa settimana."
        description="La dashboard dipendente si popola a partire dalla Milestone 5."
      />
    </div>
  );
}
