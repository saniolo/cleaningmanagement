import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function AbsencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Assenze" description="Richieste di ferie, permessi e malattia." />
      <EmptyState
        title="Nessuna richiesta di assenza in attesa."
        description="Il flusso di approvazione arriva con la Milestone 6."
      />
    </div>
  );
}
