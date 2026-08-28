"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DAY_OF_WEEK_SHORT_LABELS_IT, formatShortDateIT } from "@/lib/dates";
import { AssignmentCard } from "@/components/planning/assignment-card";
import { EditAssignmentForm } from "./edit-assignment-form";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeOption } from "@/components/planning/employee-selector";

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

export interface EmployeeWeek {
  id: string;
  firstName: string;
  lastName: string;
  byDate: Record<string, AssignmentDisplay[]>;
}

export function PlanningGrid({
  employees,
  weekDates,
  employeeOptions,
}: {
  employees: EmployeeWeek[];
  weekDates: string[];
  employeeOptions: EmployeeOption[];
}) {
  const [query, setQuery] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q));
  }, [employees, query]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca dipendente..."
          className="pl-8"
        />
      </div>

      {filteredEmployees.length === 0 ? (
        <EmptyState title="Nessun dipendente corrisponde alla ricerca." />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 w-40 bg-background">
                  Dipendente
                  {query && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({filteredEmployees.length})
                    </span>
                  )}
                </TableHead>
                {weekDates.map((dateStr) => {
                  const d = new Date(`${dateStr}T00:00:00.000Z`);
                  return (
                    <TableHead key={dateStr} className="min-w-[170px]">
                      {DAY_OF_WEEK_SHORT_LABELS_IT[d.getUTCDay()]} {formatShortDateIT(d)}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="sticky left-0 bg-background align-top font-medium">
                    {employee.firstName} {employee.lastName}
                  </TableCell>
                  {weekDates.map((dateStr) => {
                    const dayAssignments = employee.byDate[dateStr] ?? [];
                    return (
                      <TableCell key={dateStr} className="space-y-1 align-top">
                        {dayAssignments.map((a) => (
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
                                  compact
                                  durationMinutes={a.durationMinutes}
                                  customerName={a.customerName}
                                  address={a.address}
                                  serviceName={a.serviceName}
                                  proposedEmployeeName={a.proposedEmployeeName}
                                />
                              </button>
                            }
                          />
                        ))}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
