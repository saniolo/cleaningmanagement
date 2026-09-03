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
  pendingAbsenceByDate: Record<string, string>;
  totalMinutes: number;
}

// "14h 30min" / "8h" / "45min" — the week's monte ore for one employee,
// compact enough to sit right under their name in the narrow name column.
function formatTotalHours(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0h";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

interface DayAbsenceState {
  type: string;
  pending: boolean;
}

interface AbsenceRun {
  startIndex: number;
  length: number;
  type: string;
  pending: boolean;
}

function resolveDayStates(employee: EmployeeWeek, weekDates: string[]): (DayAbsenceState | null)[] {
  return weekDates.map((d) => {
    const approved = employee.absenceByDate[d];
    if (approved) return { type: approved, pending: false };
    const pending = employee.pendingAbsenceByDate[d];
    if (pending) return { type: pending, pending: true };
    return null;
  });
}

// A single absence request spans a contiguous date range by definition, so
// grouping same-state consecutive days is enough to recover "one request"
// spans without needing the request's own id — a change in type or
// approval state is always a visual (and usually real) boundary.
function computeAbsenceRuns(states: (DayAbsenceState | null)[]): AbsenceRun[] {
  const runs: AbsenceRun[] = [];
  let i = 0;
  while (i < states.length) {
    const state = states[i];
    if (!state) {
      i++;
      continue;
    }
    let length = 1;
    while (
      i + length < states.length &&
      states[i + length]?.type === state.type &&
      states[i + length]?.pending === state.pending
    ) {
      length++;
    }
    runs.push({ startIndex: i, length, type: state.type, pending: state.pending });
    i += length;
  }
  return runs;
}

type RowSegment = { kind: "absence"; run: AbsenceRun } | { kind: "day"; index: number };

// Turns the week into a sequence of cells to render: a multi-day absence
// becomes one wide segment (rendered as a single colSpan cell) instead of
// repeating the same banner in every day it covers; everything else stays
// one cell per day.
function buildRowSegments(states: (DayAbsenceState | null)[]): RowSegment[] {
  const runs = computeAbsenceRuns(states);
  const segments: RowSegment[] = [];
  let i = 0;
  let runIndex = 0;
  while (i < states.length) {
    const run = runs[runIndex];
    if (run && run.startIndex === i) {
      segments.push({ kind: "absence", run });
      i += run.length;
      runIndex++;
    } else {
      segments.push({ kind: "day", index: i });
      i++;
    }
  }
  return segments;
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

  function renderAssignmentButton(a: AssignmentDisplay) {
    const pendingConfirmation = Boolean(a.requiresConfirmation && !a.confirmedAt);
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
  }

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
              {filteredEmployees.map((employee) => {
                const segments = buildRowSegments(resolveDayStates(employee, weekDates));
                return (
                  <TableRow key={employee.id} className="group border-0 hover:bg-muted/25">
                    <TableCell className="sticky left-0 z-10 h-[58px] border-b border-r bg-background px-3 py-2 align-middle font-medium group-hover:bg-muted/25">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate text-xs font-semibold">
                          {employee.firstName} {employee.lastName}
                        </span>
                        <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                          {formatTotalHours(employee.totalMinutes)}
                        </span>
                      </div>
                    </TableCell>
                    {segments.map((segment) => {
                      if (segment.kind === "day") {
                        const dateStr = weekDates[segment.index];
                        const dayAssignments = employee.byDate[dateStr] ?? [];
                        return (
                          <TableCell
                            key={dateStr}
                            className="h-[58px] border-b border-r px-1.5 py-1.5 align-top text-[11px] last:border-r-0"
                          >
                            <div className="space-y-1.5">
                              {dayAssignments.map(renderAssignmentButton)}
                            </div>
                          </TableCell>
                        );
                      }

                      const { run } = segment;
                      const spanDates = weekDates.slice(
                        run.startIndex,
                        run.startIndex + run.length
                      );
                      // A pending absence doesn't auto-clear assignments the
                      // way an approved one does — surface any that still
                      // exist across the spanned dates instead of hiding
                      // them under the wide banner. Keep them grouped by day
                      // so a single-day activity stays under its own column
                      // rather than stretching across the whole colSpan.
                      const spannedAssignmentsByDay = run.pending
                        ? spanDates.map((d) => employee.byDate[d] ?? [])
                        : [];
                      const hasSpannedAssignments = spannedAssignmentsByDay.some(
                        (list) => list.length > 0
                      );

                      return (
                        <TableCell
                          key={`absence-${run.startIndex}`}
                          colSpan={run.length}
                          className="h-[58px] border-b border-r px-1.5 py-1.5 align-top text-[11px] last:border-r-0"
                        >
                          {run.pending ? (
                            <div className="mb-1.5 flex items-start gap-1.5 rounded-md border border-dashed border-red-300 bg-red-50 px-2 py-1.5 text-xs leading-tight text-red-800">
                              <CalendarOff className="mt-0.5 h-3 w-3 shrink-0" />
                              <div className="min-w-0">
                                <div className="truncate font-semibold">
                                  {ABSENCE_TYPE_LABELS_IT[run.type] ?? "Assenza"}
                                </div>
                                <div className="mt-1 truncate text-[10px] font-medium text-red-600">
                                  Da approvare
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-1.5 flex items-center gap-1.5 truncate rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold leading-tight text-amber-800">
                              <CalendarOff className="h-3 w-3 shrink-0" />
                              {ABSENCE_TYPE_LABELS_IT[run.type] ?? "Assente"}
                            </div>
                          )}
                          {hasSpannedAssignments && (
                            <div
                              className="grid gap-[13px]"
                              style={{
                                gridTemplateColumns: `repeat(${run.length}, minmax(0, 1fr))`,
                              }}
                            >
                              {spannedAssignmentsByDay.map((list, idx) => (
                                <div key={spanDates[idx]} className="space-y-1.5">
                                  {list.map(renderAssignmentButton)}
                                </div>
                              ))}
                            </div>
                          )}
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
    </section>
  );
}
