"use client";

import { useMemo } from "react";
import { CalendarOff } from "lucide-react";

import { DAY_OF_WEEK_SHORT_LABELS_IT } from "@/lib/dates";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { usePlanningSearch } from "./planning-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export interface EmployeeWeek {
  id: string;
  firstName: string;
  lastName: string;
  byDate: Record<string, AssignmentDisplay[]>;
  absenceByDate: Record<string, string>;
}

export function PlanningGrid({
  employees,
  weekDates,
}: {
  employees: EmployeeWeek[];
  weekDates: string[];
}) {
  const { query, selectedAssignment, setSelectedAssignment } = usePlanningSearch();

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q));
  }, [employees, query]);

  return (
    <section className="min-h-0 min-w-0 overflow-auto xl:h-full">
      {filteredEmployees.length === 0 ? (
        <EmptyState title="Nessun dipendente corrisponde alla ricerca." />
      ) : (
        <div className="block w-full min-w-[1040px] rounded-lg border bg-card align-top shadow-[0_14px_40px_-32px_rgba(15,23,42,0.24)] [&>div]:overflow-visible">
          <Table className="w-full table-fixed border-separate border-spacing-0">
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 top-0 z-20 h-16 w-36 border-b border-r bg-muted px-3 text-[11px]">
                  <span className="sr-only">Dipendente</span>
                  {query && (
                    <span className="font-normal text-muted-foreground">
                      {filteredEmployees.length} risultati
                    </span>
                  )}
                </TableHead>
                {weekDates.map((dateStr) => {
                  const d = new Date(`${dateStr}T00:00:00.000Z`);
                  return (
                    <TableHead
                      key={dateStr}
                      className="sticky top-0 z-10 h-16 border-b border-r bg-muted px-3 py-2 last:border-r-0"
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {DAY_OF_WEEK_SHORT_LABELS_IT[d.getUTCDay()]}
                      </span>
                      <span className="mt-0.5 block text-xl font-bold leading-none tabular-nums tracking-tight text-foreground">
                        {String(d.getUTCDate()).padStart(2, "0")}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="group border-0 hover:bg-muted/25">
                  <TableCell className="sticky left-0 z-10 h-[58px] border-b border-r bg-background px-3 py-2 align-middle font-medium group-hover:bg-muted/25">
                    <span className="block truncate text-xs font-semibold">
                      {employee.firstName} {employee.lastName}
                    </span>
                  </TableCell>
                  {weekDates.map((dateStr) => {
                    const dayAssignments = employee.byDate[dateStr] ?? [];
                    const absenceType = employee.absenceByDate[dateStr];
                    return (
                      <TableCell
                        key={dateStr}
                        className="h-[58px] border-b border-r px-1.5 py-1.5 align-top text-[11px] last:border-r-0"
                      >
                        {absenceType && (
                          <div className="mb-1 flex items-center justify-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-800">
                            <CalendarOff className="h-3 w-3 shrink-0" />
                            {ABSENCE_TYPE_LABELS_IT[absenceType] ?? "Assente"}
                          </div>
                        )}
                        {dayAssignments.map((a) => {
                          const pendingConfirmation = Boolean(
                            a.requiresConfirmation && !a.confirmedAt
                          );
                          const confirmed = !pendingConfirmation;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setSelectedAssignment(a)}
                              aria-pressed={selectedAssignment?.id === a.id}
                              className="block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                            >
                              <AssignmentCard
                                compact
                                durationMinutes={a.durationMinutes}
                                customerName={a.customerName}
                                address={a.address}
                                serviceName={a.serviceName}
                                pendingConfirmation={pendingConfirmation}
                                confirmed={confirmed}
                                className={
                                  selectedAssignment?.id === a.id
                                    ? "border-blue-500 ring-2 ring-blue-100 hover:border-blue-500"
                                    : undefined
                                }
                              />
                            </button>
                          );
                        })}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
