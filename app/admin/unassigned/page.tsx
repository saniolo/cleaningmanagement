import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { dateValueToDateString, formatLongDateIT, timeValueToTimeString } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { EditAssignmentForm } from "@/app/admin/planning/edit-assignment-form";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attività da assegnare"
        description="Attività scoperte che richiedono un dipendente, in ordine di data."
      />

      {assignments.length === 0 ? (
        <EmptyState title="Nessuna attività da riassegnare." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => {
            const date = dateValueToDateString(a.date);
            const startTime = timeValueToTimeString(a.startTime);
            const endTime = timeValueToTimeString(a.endTime);

            return (
              <EditAssignmentForm
                key={a.id}
                employees={employeeOptions}
                assignment={{ id: a.id, date, startTime, endTime, employeeId: undefined }}
                serviceName={a.service.name}
                locationName={a.service.location.name}
                customerName={a.service.location.customer.name}
                trigger={
                  <button type="button" className="block w-full text-left">
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      {formatLongDateIT(a.date)}
                    </div>
                    <AssignmentCard
                      startTime={startTime}
                      endTime={endTime}
                      customerName={a.service.location.customer.name}
                      locationName={a.service.location.name}
                      serviceName={a.service.name}
                      unassigned
                    />
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
