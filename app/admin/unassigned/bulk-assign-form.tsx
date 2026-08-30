"use client";

import { useState } from "react";

import { bulkAssignEmployee } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EmployeeOption } from "@/components/planning/employee-selector";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";

// At least one of the batch's dates falls in this employee's approved
// absence — doesn't say which or how many, just enough to flag it before
// the manager assigns across the whole batch in one click.
function absenceLabelForAnyDate(employee: EmployeeOption, dates: string[]): string | undefined {
  const hit = employee.absences?.find((a) => dates.some((d) => d >= a.startDate && d <= a.endDate));
  return hit ? (ABSENCE_TYPE_LABELS_IT[hit.type] ?? "Assente") : undefined;
}

export function BulkAssignForm({
  trigger,
  assignmentIds,
  dateCount,
  dates,
  employees,
}: {
  trigger: React.ReactNode;
  assignmentIds: string[];
  dateCount: number;
  dates: string[];
  employees: EmployeeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setEmployeeId(undefined);
      setError(null);
    }
  }

  async function handleSubmit() {
    if (!employeeId) {
      setError("Seleziona un dipendente.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await bulkAssignEmployee(assignmentIds, employeeId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assegna a tutte le occorrenze</DialogTitle>
          <DialogDescription>
            Assegna lo stesso dipendente a tutte le {dateCount} date mostrate qui sotto.
          </DialogDescription>
        </DialogHeader>

        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un dipendente" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => {
              const absenceLabel = absenceLabelForAnyDate(employee, dates);
              return (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                  {absenceLabel && (
                    <span className="ml-1.5 text-amber-600 dark:text-amber-500">
                      · {absenceLabel}
                    </span>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Chiudi
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Assegnazione..." : "Assegna a tutte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
