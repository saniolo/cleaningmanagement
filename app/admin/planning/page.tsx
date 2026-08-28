import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  addDaysToDateValue,
  dateStringToDateValue,
  dateValueToDateString,
  formatLongDateIT,
  getMondayOfWeek,
  startOfUtcDay,
} from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { WeekNavigation } from "@/components/planning/week-navigation";
import { Button } from "@/components/ui/button";
import { CreateAssignmentForm, type ServiceOption } from "./create-assignment-form";
import { EditAssignmentForm } from "./edit-assignment-form";
import { CloneWeekButton } from "./clone-week-button";
import { PlanningGrid, type EmployeeWeek } from "./planning-grid";

interface AssignmentDisplay {
  id: string;
  date: string;
  durationMinutes: number;
  serviceName: string;
  address: string;
  customerName: string;
  employeeId?: string;
  proposedEmployeeName?: string;
}

export default async function PlanningPage({ searchParams }: { searchParams: { week?: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const requestedDate = searchParams.week
    ? dateStringToDateValue(searchParams.week)
    : startOfUtcDay(new Date());
  const weekStart = getMondayOfWeek(requestedDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDateValue(weekStart, i));
  const weekEnd = weekDates[6];

  const [employees, assignments, services, pendingReplacements] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: admin.companyId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.assignment.findMany({
      where: { companyId: admin.companyId, date: { gte: weekStart, lte: weekEnd } },
      include: {
        service: { include: { customer: true } },
        employee: true,
      },
      orderBy: { service: { name: "asc" } },
    }),
    prisma.service.findMany({
      where: {
        companyId: admin.companyId,
        active: true,
        customer: { active: true },
      },
      include: { customer: true },
      orderBy: { name: "asc" },
    }),
    prisma.replacementRequest.findMany({
      where: {
        companyId: admin.companyId,
        status: "PENDING",
        assignment: { date: { gte: weekStart, lte: weekEnd } },
      },
      include: { proposedEmployee: true },
    }),
  ]);

  const proposedEmployeeNameByAssignmentId = new Map(
    pendingReplacements.map((r) => [
      r.assignmentId,
      `${r.proposedEmployee.firstName} ${r.proposedEmployee.lastName}`,
    ])
  );

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
  }));

  const serviceOptions: ServiceOption[] = services.map((s) => ({
    id: s.id,
    label: `${s.customer.name} · ${s.name}`,
    estimatedDurationMinutes: s.estimatedDurationMinutes,
  }));

  const byEmployeeId = new Map<string, Record<string, AssignmentDisplay[]>>();
  const unassigned: AssignmentDisplay[] = [];

  for (const a of assignments) {
    const display: AssignmentDisplay = {
      id: a.id,
      date: dateValueToDateString(a.date),
      durationMinutes: a.durationMinutes,
      serviceName: a.service.name,
      address: a.service.customer.addressLine,
      customerName: a.service.customer.name,
      employeeId: a.employeeId ?? undefined,
      proposedEmployeeName: proposedEmployeeNameByAssignmentId.get(a.id),
    };

    if (!display.employeeId) {
      unassigned.push(display);
      continue;
    }

    if (!byEmployeeId.has(display.employeeId)) {
      byEmployeeId.set(display.employeeId, {});
    }
    const byDate = byEmployeeId.get(display.employeeId)!;
    if (!byDate[display.date]) byDate[display.date] = [];
    byDate[display.date].push(display);
  }

  const weekDateStrings = weekDates.map(dateValueToDateString);
  const employeeWeeks: EmployeeWeek[] = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    byDate: byEmployeeId.get(e.id) ?? {},
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pianificazione"
        description={`${formatLongDateIT(weekStart)} – ${formatLongDateIT(weekEnd)}`}
        actions={
          <div className="flex items-center gap-2">
            <WeekNavigation weekStart={weekStart} basePath="/admin/planning" />
            <CloneWeekButton weekStart={dateValueToDateString(weekStart)} />
            <CreateAssignmentForm
              services={serviceOptions}
              employees={employeeOptions}
              defaultDate={dateValueToDateString(weekStart)}
              trigger={<Button>Nuova attività</Button>}
            />
          </div>
        }
      />

      {employees.length === 0 ? (
        <EmptyState
          title="Nessun dipendente presente."
          description="Aggiungi dipendenti da Dipendenti per iniziare a pianificare."
        />
      ) : (
        <PlanningGrid
          employees={employeeWeeks}
          weekDates={weekDateStrings}
          employeeOptions={employeeOptions}
        />
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Attività da assegnare (questa settimana)</h2>
        {unassigned.length === 0 ? (
          <EmptyState title="Nessuna attività da assegnare questa settimana." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map((a) => (
              <EditAssignmentForm
                key={a.id}
                employees={employeeOptions}
                assignment={{
                  id: a.id,
                  date: a.date,
                  durationMinutes: a.durationMinutes,
                  employeeId: a.employeeId,
                }}
                serviceName={a.serviceName}
                address={a.address}
                customerName={a.customerName}
                trigger={
                  <button type="button" className="block w-full text-left">
                    <AssignmentCard
                      durationMinutes={a.durationMinutes}
                      customerName={a.customerName}
                      address={a.address}
                      serviceName={a.serviceName}
                      unassigned
                      proposedEmployeeName={a.proposedEmployeeName}
                    />
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
