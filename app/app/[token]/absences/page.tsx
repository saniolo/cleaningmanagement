import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import { formatDateRangeIT } from "@/lib/dates";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AbsenceStatusBadge } from "@/components/shared/absence-status-badge";
import { Button } from "@/components/ui/button";
import { AbsenceRequestForm } from "./absence-request-form";

export default async function EmployeeAbsencesPage({ params }: { params: { token: string } }) {
  const employee = await resolveEmployeeByToken(params.token);
  if (!employee) notFound();

  const absences = await prisma.absenceRequest.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assenze"
        actions={
          <AbsenceRequestForm
            token={params.token}
            trigger={<Button size="sm">Nuova richiesta</Button>}
          />
        }
      />

      {absences.length === 0 ? (
        <EmptyState title="Nessuna richiesta di assenza inviata." />
      ) : (
        <div className="space-y-2">
          {absences.map((a) => (
            <div key={a.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{ABSENCE_TYPE_LABELS_IT[a.type]}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateRangeIT(a.startDate, a.endDate)}
                  </div>
                </div>
                <AbsenceStatusBadge status={a.status} />
              </div>
              {a.notes && <p className="mt-2 text-sm text-muted-foreground">{a.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
