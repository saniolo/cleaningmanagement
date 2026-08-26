import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Impostazioni" description="Dati azienda e configurazione." />
      <EmptyState title="Nessuna impostazione disponibile ancora." />
    </div>
  );
}
