import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import {
  DAY_OF_WEEK_LABELS_IT,
  DAY_OF_WEEK_SHORT_LABELS_IT,
  MONTH_LABELS_IT,
  addDaysToDateValue,
  dateStringToDateValue,
  dateValueToDateString,
  formatShortDateIT,
  getMondayOfWeek,
  startOfUtcDay,
} from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeWeekNav } from "@/components/employee/week-nav";
import { EmployeeDayPager, type EmployeeDay } from "@/components/employee/employee-day-pager";

export default async function EmployeeWeekPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { week?: string };
}) {
  const employee = await resolveEmployeeByToken(params.token);
  if (!employee) notFound();

  const today = startOfUtcDay(new Date());
  const todayStr = dateValueToDateString(today);
  const requestedDate = searchParams.week ? dateStringToDateValue(searchParams.week) : today;
  const weekStart = getMondayOfWeek(requestedDate);
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

  const days: EmployeeDay[] = weekDates.map((d) => {
    const dateStr = dateValueToDateString(d);
    return {
      dateStr,
      shortLabel: DAY_OF_WEEK_SHORT_LABELS_IT[d.getUTCDay()],
      dayNumber: d.getUTCDate(),
      dateLabel: `${DAY_OF_WEEK_LABELS_IT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_LABELS_IT[d.getUTCMonth()]}`,
      isToday: dateStr === todayStr,
      assignments: (byDate.get(dateStr) ?? []).map((a) => ({
        id: a.id,
        durationMinutes: a.durationMinutes,
        customerName: a.service.customer.name,
        address: `${a.service.customer.addressLine}, ${a.service.customer.postalCode} ${a.service.customer.city} (${a.service.customer.province})`,
        serviceName: a.service.name,
        operationalNotes: a.service.operationalNotes ?? undefined,
        requiresConfirmation: a.requiresConfirmation,
        confirmedAt: a.confirmedAt,
      })),
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Ciao, ${employee.firstName}`}
        actions={
          <EmployeeWeekNav
            token={params.token}
            weekStart={weekStart}
            rangeLabel={`${formatShortDateIT(weekStart)} – ${formatShortDateIT(weekEnd)}`}
          />
        }
      />
      <EmployeeDayPager days={days} />
    </div>
  );
}
