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

export interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface EmployeeSelectorProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SelectTrigger>,
  "value" | "onChange"
> {
  employees: EmployeeOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

// forwardRef + spread props so this works as a <FormControl> child: Slot
// injects id/aria-describedby/aria-invalid onto the immediate child, which
// only reaches the real trigger element if this component forwards them.
export const EmployeeSelector = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  EmployeeSelectorProps
>(({ employees, value, onChange, ...triggerProps }, ref) => {
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
        {employees.map((employee) => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.firstName} {employee.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
EmployeeSelector.displayName = "EmployeeSelector";
