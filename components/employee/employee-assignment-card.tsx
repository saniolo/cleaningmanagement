import { CircleDashed, MapPin, StickyNote } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmployeeAssignmentCardProps {
  dateLabel: string;
  durationMinutes: number;
  customerName: string;
  address: string;
  serviceName: string;
  operationalNotes?: string;
  requiresConfirmation?: boolean;
  confirmedAt?: Date | null;
}

// Read-only — employees can only view their own assignments here. A
// pending-confirmation one is flagged (violet, dashed) but accepted/rejected
// from "Richieste", not from this dialog — that's the one place on the
// dashboard for "things needing a yes/no from me". Only the fields
// PROJECT_SPEC.md section 14 lists are otherwise shown: date, duration,
// customer, address, service, operational notes. No internal/
// administrative fields (status, ids, recurrence source, etc.).
export function EmployeeAssignmentCard({
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
            "w-full rounded-lg border p-2 text-left shadow-sm transition-colors active:bg-accent",
            pendingConfirmation && "border-dashed border-violet-500/60 bg-violet-500/5"
          )}
        >
          {/* L'attività e il cliente sono l'informazione primaria — la
              durata resta leggibile ma secondaria, in alto a destra. */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{serviceName}</span>
            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
              {durationMinutes} min
            </span>
          </div>
          <div className="truncate text-xs font-medium text-foreground/80">{customerName}</div>
          <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{address}</span>
          </div>
          {operationalNotes && (
            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] italic text-muted-foreground">
              <StickyNote className="h-3 w-3 shrink-0" />
              <span className="truncate">{operationalNotes}</span>
            </div>
          )}
          {pendingConfirmation && (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-400">
              <CircleDashed className="h-3 w-3 shrink-0" />
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

        {pendingConfirmation && (
          <p className="flex items-center gap-1.5 rounded-md border border-dashed border-violet-500/60 bg-violet-500/5 p-2.5 text-xs text-violet-700 dark:text-violet-400">
            <CircleDashed className="h-3.5 w-3.5 shrink-0" />
            Da accettare o rifiutare dalla sezione &quot;Richieste&quot;.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
