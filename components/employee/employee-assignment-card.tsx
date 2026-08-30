import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmAssignmentButton } from "./confirm-assignment-button";

interface EmployeeAssignmentCardProps {
  id: string;
  token: string;
  dateLabel: string;
  durationMinutes: number;
  customerName: string;
  address: string;
  serviceName: string;
  operationalNotes?: string;
  requiresConfirmation?: boolean;
  confirmedAt?: Date | null;
}

// Read-only except for accepting/rejecting a pending activity — employees
// can only view their own assignments, plus (when asked) act on ones
// flagged "Richiede conferma" by the admin, whether that activity was
// freshly proposed or reassigned from someone else. Only the fields
// PROJECT_SPEC.md section 14 lists are otherwise shown: date, duration,
// customer, address, service, operational notes. No internal/
// administrative fields (status, ids, recurrence source, etc.).
export function EmployeeAssignmentCard({
  id,
  token,
  dateLabel,
  durationMinutes,
  customerName,
  address,
  serviceName,
  operationalNotes,
  requiresConfirmation,
  confirmedAt,
}: EmployeeAssignmentCardProps) {
  const pendingConfirmation = Boolean(requiresConfirmation && !confirmedAt);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full rounded-lg border p-3 text-left shadow-sm transition-colors active:bg-accent",
            pendingConfirmation && "border-dashed border-violet-500/60 bg-violet-500/5"
          )}
        >
          <div className="text-sm font-semibold">{durationMinutes} min</div>
          <div className="text-sm text-muted-foreground">{customerName}</div>
          <div className="text-sm font-medium">{serviceName}</div>
          {pendingConfirmation && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-400">
              <CircleDashed className="h-3.5 w-3.5 shrink-0" />
              Da confermare
            </div>
          )}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{serviceName}</DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium text-muted-foreground">Durata</div>
            <div>{durationMinutes} min</div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Cliente</div>
            <div>{customerName}</div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Indirizzo</div>
            <div>{address}</div>
          </div>
          {operationalNotes && (
            <div>
              <div className="font-medium text-muted-foreground">Note operative</div>
              <div>{operationalNotes}</div>
            </div>
          )}
        </div>

        {pendingConfirmation && <ConfirmAssignmentButton token={token} id={id} />}
      </DialogContent>
    </Dialog>
  );
}
