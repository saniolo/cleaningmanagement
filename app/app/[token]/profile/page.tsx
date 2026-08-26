import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function EmployeeProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profilo" />
      <EmptyState
        title="Informazioni profilo non ancora disponibili."
        description="Sola lettura: non è previsto un login dipendente in questa fase."
      />
    </div>
  );
}
