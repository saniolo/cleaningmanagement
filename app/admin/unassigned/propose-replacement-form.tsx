"use client";

import { useState } from "react";

import { proposeReplacement } from "./actions";
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

export interface EligibleEmployee {
  id: string;
  firstName: string;
  lastName: string;
  assignedCount: number;
  assignedMinutes: number;
}

function workloadLabel(employee: EligibleEmployee): string {
  if (employee.assignedCount === 0) return `${employee.firstName} ${employee.lastName}`;
  return `${employee.firstName} ${employee.lastName} — ${employee.assignedCount} attività, ${employee.assignedMinutes} min oggi`;
}

export function ProposeReplacementForm({
  trigger,
  assignmentId,
  eligibleEmployees,
}: {
  trigger: React.ReactNode;
  assignmentId: string;
  eligibleEmployees: EligibleEmployee[];
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
    const result = await proposeReplacement(assignmentId, employeeId);
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
          <DialogTitle>Proponi sostituzione</DialogTitle>
          <DialogDescription>
            Seleziona un dipendente idoneo (attivo, non assente) — mostrato con quante attività ha
            già oggi. La proposta va confermata dal dipendente.
          </DialogDescription>
        </DialogHeader>

        {eligibleEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun dipendente idoneo per questa attività al momento.
          </p>
        ) : (
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona un dipendente" />
            </SelectTrigger>
            <SelectContent>
              {eligibleEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {workloadLabel(employee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || eligibleEmployees.length === 0}
          >
            {loading ? "Invio..." : "Proponi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
