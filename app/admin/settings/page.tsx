import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateAssignmentsButton } from "./generate-assignments-button";
import { DEFAULT_HORIZON_WEEKS } from "@/lib/scheduling/generate";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Impostazioni" description="Dati azienda e configurazione." />

      <Card>
        <CardHeader>
          <CardTitle>Generazione attività ricorrenti</CardTitle>
          <CardDescription>
            Crea le attività datate per le prossime {DEFAULT_HORIZON_WEEKS} settimane a partire
            dalle ricorrenze attive. L&apos;operazione è sicura da ripetere: le attività già
            generate non vengono duplicate. In produzione viene eseguita automaticamente ogni
            giorno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateAssignmentsButton />
        </CardContent>
      </Card>
    </div>
  );
}
