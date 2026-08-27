import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getEligibleEmployees } from "@/lib/scheduling/eligibility";
import { dateValueToDateString, formatLongDateIT, timeValueToTimeString } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { Button } from "@/components/ui/button";
import { EditAssignmentForm } from "@/app/admin/planning/edit-assignment-form";
import { ProposeReplacementForm } from "./propose-replacement-form";
import { CancelReplacementButton } from "./cancel-replacement-button";

export default async function UnassignedPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const [employees, assignments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: admin.companyId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.assignment.findMany({
      where: { companyId: admin.companyId, status: "UNASSIGNED" },
      include: { service: { include: { location: { include: { customer: true } } } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
  }));

  const cards = await Promise.all(
    assignments.map(async (a) => {
      const pendingReplacement = await prisma.replacementRequest.findFirst({
        where: { assignmentId: a.id, status: "PENDING" },
        include: { proposedEmployee: true },
      });

      const eligibleEmployees = pendingReplacement
        ? []
        : await getEligibleEmployees(admin.companyId, a.date, a.startTime, a.endTime);

      return { assignment: a, pendingReplacement, eligibleEmployees };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attività da assegnare"
        description="Attività scoperte che richiedono un dipendente, in ordine di data."
      />

      {cards.length === 0 ? (
        <EmptyState title="Nessuna attività da riassegnare." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ assignment: a, pendingReplacement, eligibleEmployees }) => {
            const date = dateValueToDateString(a.date);
            const startTime = timeValueToTimeString(a.startTime);
            const endTime = timeValueToTimeString(a.endTime);

            return (
              <div key={a.id} className="space-y-2 rounded-lg border p-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {formatLongDateIT(a.date)}
                </div>
                <AssignmentCard
                  startTime={startTime}
                  endTime={endTime}
                  customerName={a.service.location.customer.name}
                  locationName={a.service.location.name}
                  serviceName={a.service.name}
                  unassigned
                  className="border-none p-0 shadow-none hover:bg-transparent"
                />

                {pendingReplacement ? (
                  <div className="space-y-2 rounded-md bg-muted p-2 text-xs">
                    <p>
                      Proposta a {pendingReplacement.proposedEmployee.firstName}{" "}
                      {pendingReplacement.proposedEmployee.lastName}, in attesa di risposta.
                    </p>
                    <CancelReplacementButton id={pendingReplacement.id} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <EditAssignmentForm
                      employees={employeeOptions}
                      assignment={{ id: a.id, date, startTime, endTime, employeeId: undefined }}
                      serviceName={a.service.name}
                      locationName={a.service.location.name}
                      customerName={a.service.location.customer.name}
                      trigger={
                        <Button size="sm" variant="outline" className="w-full">
                          Assegna direttamente
                        </Button>
                      }
                    />
                    <ProposeReplacementForm
                      assignmentId={a.id}
                      eligibleEmployees={eligibleEmployees}
                      trigger={
                        <Button size="sm" className="w-full">
                          Proponi sostituzione
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
