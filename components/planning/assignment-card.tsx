import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  durationMinutes: number;
  customerName: string;
  address: string;
  serviceName: string;
  employeeName?: string;
  unassigned?: boolean;
  proposedEmployeeName?: string;
  className?: string;
  // Two lines instead of three-plus — for the weekly grid, where a cell can
  // stack several of these and the employee is already identified by the
  // row, so full detail (customer/address) is a click away rather than
  // always on screen.
  compact?: boolean;
}

export function AssignmentCard({
  durationMinutes,
  customerName,
  address,
  serviceName,
  employeeName,
  unassigned,
  proposedEmployeeName,
  className,
  compact,
}: AssignmentCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "w-full rounded-md border px-1.5 py-1 text-left text-xs leading-tight shadow-sm transition-colors hover:bg-accent",
          unassigned && "border-destructive/50 bg-destructive/5",
          proposedEmployeeName && "border-amber-500/50 bg-amber-500/5",
          className
        )}
      >
        <div className="truncate font-medium">
          {durationMinutes} min · {serviceName}
        </div>
        <div className="truncate text-muted-foreground">
          {customerName} · {address}
        </div>
        {proposedEmployeeName && (
          <div className="mt-0.5 flex items-center gap-1 truncate text-amber-600 dark:text-amber-500">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">In attesa: {proposedEmployeeName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-md border px-2 py-1.5 text-left text-xs shadow-sm transition-colors hover:bg-accent",
        unassigned && "border-destructive/50 bg-destructive/5",
        proposedEmployeeName && "border-amber-500/50 bg-amber-500/5",
        className
      )}
    >
      <div className="font-medium">{durationMinutes} min</div>
      <div className="truncate text-muted-foreground">
        {customerName} · {address}
      </div>
      <div className="truncate font-medium">{serviceName}</div>
      {employeeName && <div className="truncate text-muted-foreground">{employeeName}</div>}
      {proposedEmployeeName && (
        <div className="mt-1 flex items-center gap-1 truncate text-amber-600 dark:text-amber-500">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate">In attesa: {proposedEmployeeName}</span>
        </div>
      )}
    </div>
  );
}
