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

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function BulkAssignForm({
  trigger,
  assignmentIds,
  dateCount,
  employees,
}: {
  trigger: React.ReactNode;
  assignmentIds: string[];
  dateCount: number;
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
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </SelectItem>
            ))}
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
