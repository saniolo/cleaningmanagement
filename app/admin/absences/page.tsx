import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AbsencesTable } from "./absences-table";

export default async function AbsencesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const absences = await prisma.absenceRequest.findMany({
    where: { companyId: admin.companyId },
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  const pending = absences.filter((a) => a.status === "PENDING");
  const history = absences.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-8">
      <PageHeader title="Assenze" description="Richieste di ferie, permessi e malattia." />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Richieste in attesa</h2>
        {pending.length === 0 ? (
          <EmptyState title="Nessuna richiesta di assenza in attesa." />
        ) : (
          <AbsencesTable absences={pending} actionable />
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Storico</h2>
        {history.length === 0 ? (
          <EmptyState title="Nessuna richiesta gestita finora." />
        ) : (
          <AbsencesTable absences={history} actionable={false} />
        )}
      </div>
    </div>
  );
}
