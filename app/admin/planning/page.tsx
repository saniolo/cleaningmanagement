import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function PlanningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pianificazione"
        description="Vista settimanale di dipendenti, attività e turni."
      />
      <EmptyState
        title="La griglia di pianificazione arriva con la Milestone 4."
        description="Richiede prima anagrafiche (Milestone 2) e ricorrenze (Milestone 3)."
      />
    </div>
  );
}
