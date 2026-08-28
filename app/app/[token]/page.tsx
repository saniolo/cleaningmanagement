import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import {
  DAY_OF_WEEK_LABELS_IT,
  MONTH_LABELS_IT,
  addDaysToDateValue,
  dateValueToDateString,
  getMondayOfWeek,
  startOfUtcDay,
} from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EmployeeAssignmentCard } from "@/components/employee/employee-assignment-card";

export default async function EmployeeWeekPage({ params }: { params: { token: string } }) {
  const employee = await resolveEmployeeByToken(params.token);
  if (!employee) notFound();

  const weekStart = getMondayOfWeek(startOfUtcDay(new Date()));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDateValue(weekStart, i));
  const weekEnd = weekDates[6];

  const assignments = await prisma.assignment.findMany({
    where: { employeeId: employee.id, date: { gte: weekStart, lte: weekEnd } },
    include: { service: { include: { customer: true } } },
    orderBy: [{ date: "asc" }, { service: { name: "asc" } }],
  });

  const byDate = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = dateValueToDateString(a.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Questa settimana" />

      {assignments.length === 0 ? (
        <EmptyState title="Nessuna attività programmata questa settimana." />
      ) : (
        weekDates.map((d) => {
          const key = dateValueToDateString(d);
          const dayAssignments = byDate.get(key);
          if (!dayAssignments || dayAssignments.length === 0) return null;

          const dateLabel = `${DAY_OF_WEEK_LABELS_IT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_LABELS_IT[d.getUTCMonth()]}`;

          return (
            <section key={key} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {dateLabel}
              </h2>
              <div className="space-y-2">
                {dayAssignments.map((a) => (
                  <EmployeeAssignmentCard
                    key={a.id}
                    dateLabel={dateLabel}
                    durationMinutes={a.durationMinutes}
                    customerName={a.service.customer.name}
                    address={`${a.service.customer.addressLine}, ${a.service.customer.postalCode} ${a.service.customer.city} (${a.service.customer.province})`}
                    serviceName={a.service.name}
                    operationalNotes={a.service.operationalNotes ?? undefined}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
