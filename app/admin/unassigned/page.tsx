import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function UnassignedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attività da assegnare"
        description="Attività scoperte che richiedono un dipendente."
      />
      <EmptyState
        title="Nessuna attività da riassegnare."
        description="Questa vista arriva con la Milestone 4 (pianificazione) e si popola con la Milestone 7 (sostituzioni)."
      />
    </div>
  );
}
