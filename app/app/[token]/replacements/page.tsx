import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import { formatLongDateIT, timeValueToTimeString } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { Badge } from "@/components/ui/badge";
import { ReplacementActions } from "./replacement-actions";

const HISTORY_STATUS_LABELS_IT: Record<string, string> = {
  ACCEPTED: "Accettata",
  REJECTED: "Rifiutata",
  CANCELLED: "Annullata dal responsabile",
};

export default async function EmployeeReplacementsPage({ params }: { params: { token: string } }) {
  const employee = await resolveEmployeeByToken(params.token);
  if (!employee) notFound();

  const requests = await prisma.replacementRequest.findMany({
    where: { proposedEmployeeId: employee.id },
    include: {
      assignment: {
        include: { service: { include: { location: { include: { customer: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader title="Richieste di sostituzione" />

      {pending.length === 0 ? (
        <EmptyState title="Nessuna sostituzione da confermare." />
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="space-y-2 rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">
                {formatLongDateIT(r.assignment.date)}
              </div>
              <AssignmentCard
                startTime={timeValueToTimeString(r.assignment.startTime)}
                endTime={timeValueToTimeString(r.assignment.endTime)}
                customerName={r.assignment.service.location.customer.name}
                locationName={r.assignment.service.location.name}
                serviceName={r.assignment.service.name}
                className="border-none p-0 shadow-none hover:bg-transparent"
              />
              <ReplacementActions token={params.token} id={r.id} />
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Storico
          </h2>
          <div className="space-y-2">
            {history.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <div className="text-sm font-medium">{r.assignment.service.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatLongDateIT(r.assignment.date)}
                  </div>
                </div>
                <Badge variant={r.status === "ACCEPTED" ? "default" : "secondary"}>
                  {HISTORY_STATUS_LABELS_IT[r.status] ?? r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
