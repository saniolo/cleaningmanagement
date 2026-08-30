"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNASSIGNED_VALUE } from "@/lib/validation/assignment";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";

export interface EmployeeAbsence {
  startDate: string;
  endDate: string;
  type: string;
}

export interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  absences?: EmployeeAbsence[];
}

interface EmployeeSelectorProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SelectTrigger>,
  "value" | "onChange"
> {
  employees: EmployeeOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  // The date this selection is for — lets each option flag employees whose
  // approved absence covers it, so the admin stays aware and decides
  // whether to assign them anyway rather than the app silently hiding them.
  date?: string;
}

function absenceLabelFor(employee: EmployeeOption, date: string | undefined): string | undefined {
  if (!date || !employee.absences) return undefined;
  const hit = employee.absences.find((a) => date >= a.startDate && date <= a.endDate);
  return hit ? (ABSENCE_TYPE_LABELS_IT[hit.type] ?? "Assente") : undefined;
}

// forwardRef + spread props so this works as a <FormControl> child: Slot
// injects id/aria-describedby/aria-invalid onto the immediate child, which
// only reaches the real trigger element if this component forwards them.
export const EmployeeSelector = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  EmployeeSelectorProps
>(({ employees, value, onChange, date, ...triggerProps }, ref) => {
  return (
    <Select
      value={value ?? UNASSIGNED_VALUE}
      onValueChange={(v) => onChange(v === UNASSIGNED_VALUE ? undefined : v)}
    >
      <SelectTrigger ref={ref} {...triggerProps}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>Nessuno (non assegnato)</SelectItem>
        {employees.map((employee) => {
          const absenceLabel = absenceLabelFor(employee, date);
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
  );
});
EmployeeSelector.displayName = "EmployeeSelector";
