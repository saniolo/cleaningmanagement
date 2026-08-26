import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  DAY_OF_WEEK_SHORT_LABELS_IT,
  addDaysToDateValue,
  dateStringToDateValue,
  dateValueToDateString,
  formatLongDateIT,
  formatShortDateIT,
  getMondayOfWeek,
  startOfUtcDay,
  timeValueToTimeString,
} from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { WeekNavigation } from "@/components/planning/week-navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateAssignmentForm, type ServiceOption } from "./create-assignment-form";
import { EditAssignmentForm } from "./edit-assignment-form";

interface AssignmentDisplay {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  locationName: string;
  customerName: string;
  employeeId?: string;
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

  const [employees, assignments, services] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: admin.companyId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.assignment.findMany({
      where: { companyId: admin.companyId, date: { gte: weekStart, lte: weekEnd } },
      include: {
        service: { include: { location: { include: { customer: true } } } },
        employee: true,
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.service.findMany({
      where: {
        companyId: admin.companyId,
        active: true,
        location: { active: true, customer: { active: true } },
      },
      include: { location: { include: { customer: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
  }));

  const serviceOptions: ServiceOption[] = services.map((s) => ({
    id: s.id,
    label: `${s.location.customer.name} · ${s.location.name} · ${s.name}`,
  }));

  const byEmployeeAndDate = new Map<string, Map<string, AssignmentDisplay[]>>();
  const unassigned: AssignmentDisplay[] = [];

  for (const a of assignments) {
    const display: AssignmentDisplay = {
      id: a.id,
      date: dateValueToDateString(a.date),
      startTime: timeValueToTimeString(a.startTime),
      endTime: timeValueToTimeString(a.endTime),
      serviceName: a.service.name,
      locationName: a.service.location.name,
      customerName: a.service.location.customer.name,
      employeeId: a.employeeId ?? undefined,
    };

    if (!display.employeeId) {
      unassigned.push(display);
      continue;
    }

    if (!byEmployeeAndDate.has(display.employeeId)) {
      byEmployeeAndDate.set(display.employeeId, new Map());
    }
    const byDate = byEmployeeAndDate.get(display.employeeId)!;
    if (!byDate.has(display.date)) byDate.set(display.date, []);
    byDate.get(display.date)!.push(display);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pianificazione"
        description={`${formatLongDateIT(weekStart)} – ${formatLongDateIT(weekEnd)}`}
        actions={
          <div className="flex items-center gap-2">
            <WeekNavigation weekStart={weekStart} basePath="/admin/planning" />
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 w-40 bg-background">Dipendente</TableHead>
                {weekDates.map((d) => (
                  <TableHead key={dateValueToDateString(d)} className="min-w-[170px]">
                    {DAY_OF_WEEK_SHORT_LABELS_IT[d.getUTCDay()]} {formatShortDateIT(d)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const byDate = byEmployeeAndDate.get(employee.id);
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="sticky left-0 bg-background align-top font-medium">
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    {weekDates.map((d) => {
                      const dateStr = dateValueToDateString(d);
                      const dayAssignments = byDate?.get(dateStr) ?? [];
                      return (
                        <TableCell key={dateStr} className="space-y-1 align-top">
                          {dayAssignments.map((a) => (
                            <EditAssignmentForm
                              key={a.id}
                              employees={employeeOptions}
                              assignment={{
                                id: a.id,
                                date: a.date,
                                startTime: a.startTime,
                                endTime: a.endTime,
                                employeeId: a.employeeId,
                              }}
                              serviceName={a.serviceName}
                              locationName={a.locationName}
                              customerName={a.customerName}
                              trigger={
                                <button type="button" className="block w-full text-left">
                                  <AssignmentCard
                                    startTime={a.startTime}
                                    endTime={a.endTime}
                                    customerName={a.customerName}
                                    locationName={a.locationName}
                                    serviceName={a.serviceName}
                                  />
                                </button>
                              }
                            />
                          ))}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
                  startTime: a.startTime,
                  endTime: a.endTime,
                  employeeId: a.employeeId,
                }}
                serviceName={a.serviceName}
                locationName={a.locationName}
                customerName={a.customerName}
                trigger={
                  <button type="button" className="block w-full text-left">
                    <AssignmentCard
                      startTime={a.startTime}
                      endTime={a.endTime}
                      customerName={a.customerName}
                      locationName={a.locationName}
                      serviceName={a.serviceName}
                      unassigned
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
