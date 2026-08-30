"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditAssignmentForm } from "@/app/admin/planning/edit-assignment-form";
import { BulkAssignForm } from "./bulk-assign-form";
import type { EmployeeOption } from "@/components/planning/employee-selector";

export interface UnassignedOccurrence {
  id: string;
  date: string;
  displayDate: string;
  durationMinutes: number;
  serviceName: string;
  sourceRecurringScheduleId: string | null;
}

export function CustomerUnassignedCard({
  customerName,
  address,
  occurrences,
  employees,
}: {
  customerName: string;
  address: string;
  occurrences: UnassignedOccurrence[];
  employees: EmployeeOption[];
}) {
  const [open, setOpen] = useState(false);

  // Occurrences generated from the same recurring schedule (e.g. "Pulizia
  // scale" every lunedì) are the same activity repeated on different
  // dates, not distinct activities — grouping them lets the manager assign
  // one employee to all of them at once instead of opening each date
  // individually. One-off occurrences (no source schedule) and schedules
  // that currently have just one uncovered date keep the plain single-row
  // layout, since a group of one gains nothing from the bulk affordance.
  type Group = { key: string; serviceName: string; items: UnassignedOccurrence[] };
  const bySchedule = new Map<string, UnassignedOccurrence[]>();
  const singles: UnassignedOccurrence[] = [];
  for (const occ of occurrences) {
    const key = occ.sourceRecurringScheduleId;
    if (!key) {
      singles.push(occ);
      continue;
    }
    if (!bySchedule.has(key)) bySchedule.set(key, []);
    bySchedule.get(key)!.push(occ);
  }

  const groups: Group[] = [];
  for (const [key, items] of Array.from(bySchedule.entries())) {
    if (items.length > 1) {
      groups.push({ key, serviceName: items[0].serviceName, items });
    } else {
      singles.push(...items);
    }
  }
  groups.sort((a, b) => a.items[0].date.localeCompare(b.items[0].date));
  singles.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full space-y-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{customerName}</div>
              <div className="text-xs text-muted-foreground">{address}</div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {occurrences.length} da assegnare
            </Badge>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customerName}</DialogTitle>
          <DialogDescription>{address} — assegna un dipendente a ogni occorrenza</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groups.map((group) => {
            const assignmentIds = group.items.map((occ) => occ.id);

            return (
              <div key={group.key} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold">{group.serviceName}</div>
                  <Badge variant="secondary" className="shrink-0">
                    {group.items.length} date
                  </Badge>
                </div>

                <div className="space-y-1">
                  {group.items.map((occ) => (
                    <div
                      key={occ.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                    >
                      <div>
                        <div className="font-medium">{occ.displayDate}</div>
                        <div className="text-muted-foreground">{occ.durationMinutes} min</div>
                      </div>
                      <EditAssignmentForm
                        employees={employees}
                        assignment={{
                          id: occ.id,
                          date: occ.date,
                          durationMinutes: occ.durationMinutes,
                          employeeId: undefined,
                        }}
                        serviceName={group.serviceName}
                        address={address}
                        customerName={customerName}
                        trigger={
                          <Button size="sm" variant="ghost">
                            Assegna
                          </Button>
                        }
                      />
                    </div>
                  ))}
                </div>

                <BulkAssignForm
                  assignmentIds={assignmentIds}
                  dateCount={assignmentIds.length}
                  dates={group.items.map((occ) => occ.date)}
                  employees={employees}
                  trigger={
                    <Button size="sm" className="w-full">
                      Assegna a tutte ({assignmentIds.length})
                    </Button>
                  }
                />
              </div>
            );
          })}

          {singles.map((occ) => (
            <div key={occ.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold">{occ.serviceName}</div>
                <div className="text-xs text-muted-foreground">{occ.displayDate}</div>
              </div>
              <div className="text-xs text-muted-foreground">{occ.durationMinutes} min</div>

              <EditAssignmentForm
                employees={employees}
                assignment={{
                  id: occ.id,
                  date: occ.date,
                  durationMinutes: occ.durationMinutes,
                  employeeId: undefined,
                }}
                serviceName={occ.serviceName}
                address={address}
                customerName={customerName}
                trigger={
                  <Button size="sm" variant="outline" className="w-full">
                    Assegna direttamente
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
