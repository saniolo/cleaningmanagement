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
import { WeekNavigation } from "@/components/planning/week-navigation";
import { StatusLegend } from "@/components/planning/status-legend";
import { CloneWeekButton } from "./clone-week-button";
import { PlanningGrid, type EmployeeWeek } from "./planning-grid";
import { UnassignedPlanningPanel, type UnassignedPlanningGroup } from "./unassigned-planning-panel";
import { PlanningSearchInput, PlanningSearchProvider } from "./planning-search";

interface AssignmentDisplay {
  id: string;
  date: string;
  durationMinutes: number;
  serviceName: string;
  address: string;
  customerName: string;
  employeeId?: string;
  requiresConfirmation?: boolean;
  confirmedAt?: string;
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

  const [employees, assignments, approvedAbsences, pendingAbsences] = await Promise.all([
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
    prisma.absenceRequest.findMany({
      where: {
        companyId: admin.companyId,
        status: "APPROVED",
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
    }),
    prisma.absenceRequest.findMany({
      where: {
        companyId: admin.companyId,
        status: "PENDING",
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
    }),
  ]);

  const absenceRangesByEmployeeId = new Map<
    string,
    { startDate: string; endDate: string; type: string }[]
  >();
  for (const absence of approvedAbsences) {
    if (!absenceRangesByEmployeeId.has(absence.employeeId)) {
      absenceRangesByEmployeeId.set(absence.employeeId, []);
    }
    absenceRangesByEmployeeId.get(absence.employeeId)!.push({
      startDate: dateValueToDateString(absence.startDate),
      endDate: dateValueToDateString(absence.endDate),
      type: absence.type,
    });
  }

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    absences: absenceRangesByEmployeeId.get(e.id) ?? [],
  }));

  const byEmployeeId = new Map<string, Record<string, AssignmentDisplay[]>>();
  // Monte ore settimanale per dipendente — somma delle attività assegnate
  // (comprese quelle "da confermare": il tempo è comunque riservato finché
  // non vengono rifiutate).
  const totalMinutesByEmployeeId = new Map<string, number>();
  for (const a of assignments) {
    const display: AssignmentDisplay = {
      id: a.id,
      date: dateValueToDateString(a.date),
      durationMinutes: a.durationMinutes,
      serviceName: a.service.name,
      address: a.service.customer.addressLine,
      customerName: a.service.customer.name,
      employeeId: a.employeeId ?? undefined,
      requiresConfirmation: a.requiresConfirmation,
      confirmedAt: a.confirmedAt ? a.confirmedAt.toISOString() : undefined,
    };

    if (!display.employeeId) {
      continue;
    }

    if (!byEmployeeId.has(display.employeeId)) {
      byEmployeeId.set(display.employeeId, {});
    }
    const byDate = byEmployeeId.get(display.employeeId)!;
    if (!byDate[display.date]) byDate[display.date] = [];
    byDate[display.date].push(display);

    totalMinutesByEmployeeId.set(
      display.employeeId,
      (totalMinutesByEmployeeId.get(display.employeeId) ?? 0) + a.durationMinutes
    );
  }

  const weekDateStrings = weekDates.map(dateValueToDateString);

  // Approved absences already free up any ASSIGNED activity for their date
  // range (see the absence-approval action), so a cell under an absent day
  // is normally just empty — indistinguishable from "nothing scheduled".
  // Mark it explicitly so it reads as "non disponibile", not "da coprire".
  function buildAbsenceByEmployeeId(absences: typeof approvedAbsences) {
    const byEmployee = new Map<string, Record<string, string>>();
    for (const absence of absences) {
      if (!byEmployee.has(absence.employeeId)) {
        byEmployee.set(absence.employeeId, {});
      }
      const byDate = byEmployee.get(absence.employeeId)!;
      for (const dateStr of weekDateStrings) {
        const date = dateStringToDateValue(dateStr);
        if (date >= absence.startDate && date <= absence.endDate) {
          byDate[dateStr] = absence.type;
        }
      }
    }
    return byEmployee;
  }

  const absenceByEmployeeId = buildAbsenceByEmployeeId(approvedAbsences);
  // Still just a request — doesn't block the employee's slot yet, so it's
  // shown separately from the approved marker (dashed, "da approvare")
  // rather than treated as if it were already settled.
  const pendingAbsenceByEmployeeId = buildAbsenceByEmployeeId(pendingAbsences);

  const employeeWeeks: EmployeeWeek[] = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    byDate: byEmployeeId.get(e.id) ?? {},
    absenceByDate: absenceByEmployeeId.get(e.id) ?? {},
    pendingAbsenceByDate: pendingAbsenceByEmployeeId.get(e.id) ?? {},
    totalMinutes: totalMinutesByEmployeeId.get(e.id) ?? 0,
  }));

  const unassignedGroupsById = new Map<string, UnassignedPlanningGroup>();
  for (const a of assignments) {
    if (a.employeeId) continue;
    // The service is the Cliente–Attività identity. All of its uncovered
    // dates belong in one card, even when they were generated by different
    // recurring schedules or created as one-off occurrences.
    const groupId = a.serviceId;
    let group = unassignedGroupsById.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        customerName: a.service.customer.name,
        address: a.service.customer.addressLine,
        serviceName: a.service.name,
        durationMinutes: a.durationMinutes,
        occurrences: [],
      };
      unassignedGroupsById.set(groupId, group);
    }
    group.occurrences.push({
      id: a.id,
      date: dateValueToDateString(a.date),
      displayDate: formatLongDateIT(a.date),
      durationMinutes: a.durationMinutes,
      requiresConfirmation: a.requiresConfirmation,
    });
  }
  const unassignedGroups = Array.from(unassignedGroupsById.values())
    .map((group) => ({
      ...group,
      occurrences: group.occurrences.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort(
      (a, b) =>
        a.customerName.localeCompare(b.customerName, "it") ||
        a.serviceName.localeCompare(b.serviceName, "it")
    );

  return (
    <PlanningSearchProvider>
      <div
        className={
          employees.length > 0
            ? "grid min-h-0 gap-5 xl:h-full xl:grid-cols-[minmax(0,1fr)_21rem]"
            : "min-h-0 xl:h-full"
        }
      >
        <section className="flex min-h-0 min-w-0 flex-col gap-5">
          <PageHeader
            title="Pianificazione"
            description={`${formatLongDateIT(weekStart)} – ${formatLongDateIT(weekEnd)}`}
            actions={
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <PlanningSearchInput />
                  <WeekNavigation weekStart={weekStart} basePath="/admin/planning" />
                  <CloneWeekButton weekStart={dateValueToDateString(weekStart)} />
                </div>
                <StatusLegend />
              </div>
            }
          />

          {employees.length === 0 ? (
            <EmptyState
              title="Nessun dipendente presente."
              description="Aggiungi dipendenti da Dipendenti per iniziare a pianificare."
            />
          ) : (
            <div className="min-h-0 min-w-0 flex-1">
              <PlanningGrid employees={employeeWeeks} weekDates={weekDateStrings} />
            </div>
          )}
        </section>

        {employees.length > 0 && (
          <UnassignedPlanningPanel groups={unassignedGroups} employees={employeeOptions} />
        )}
      </div>
    </PlanningSearchProvider>
  );
}
