import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import { formatLongDateWithWeekdayIT } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { ConfirmAssignmentButton } from "@/components/employee/confirm-assignment-button";

// Every activity flagged "Richiede conferma" by the admin, still waiting on
// this employee's accept/reject — the one dedicated place on the dashboard
// for "things needing a yes/no from me", separate from "Calendario" (which
// just shows what's scheduled, pending or not).
export default async function EmployeeRequestsPage({ params }: { params: { token: string } }) {
  const employee = await resolveEmployeeByToken(params.token);
  if (!employee) notFound();

  const pending = await prisma.assignment.findMany({
    where: {
      employeeId: employee.id,
      status: "ASSIGNED",
      requiresConfirmation: true,
      confirmedAt: null,
    },
    include: { service: { include: { customer: true } } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Richieste" />

      {pending.length === 0 ? (
        <EmptyState title="Nessuna richiesta da accettare o rifiutare." />
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="space-y-2 rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">
                {formatLongDateWithWeekdayIT(a.date)}
              </div>
              <AssignmentCard
                durationMinutes={a.durationMinutes}
                customerName={a.service.customer.name}
                address={a.service.customer.addressLine}
                serviceName={a.service.name}
                className="border-none p-0 shadow-none hover:bg-transparent"
              />
              <ConfirmAssignmentButton token={params.token} id={a.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
