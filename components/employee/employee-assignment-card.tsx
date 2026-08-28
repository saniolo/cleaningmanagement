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
}

// Read-only — employees can only view their own assignments (never trust or
// expose anything editable here). Only the fields PROJECT_SPEC.md section 14
// lists are shown: date, duration, customer, address, service, operational
// notes. No internal/administrative fields (status, ids, recurrence source,
// etc.).
export function EmployeeAssignmentCard({
  dateLabel,
  durationMinutes,
  customerName,
  address,
  serviceName,
  operationalNotes,
}: EmployeeAssignmentCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full rounded-lg border p-3 text-left shadow-sm transition-colors active:bg-accent"
        >
          <div className="text-sm font-semibold">{durationMinutes} min</div>
          <div className="text-sm text-muted-foreground">{customerName}</div>
          <div className="text-sm font-medium">{serviceName}</div>
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
      </DialogContent>
    </Dialog>
  );
}
