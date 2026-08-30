import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  durationMinutes: number;
  customerName: string;
  address: string;
  serviceName: string;
  employeeName?: string;
  unassigned?: boolean;
  // Assigned, but the employee hasn't accepted it yet — a distinct visual
  // state from both "unassigned" (nobody on it) and "confirmed".
  pendingConfirmation?: boolean;
  // Assigned and settled — no pending confirmation. The calendar's
  // "everything is fine here" color; see components/planning/
  // status-legend.tsx, which explains this and the state above without
  // repeating the label on every single card.
  confirmed?: boolean;
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
  pendingConfirmation,
  confirmed,
  className,
  compact,
}: AssignmentCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-md border bg-background px-2 py-1.5 text-left text-xs leading-tight shadow-sm transition-all duration-200 hover:border-foreground/20 hover:bg-muted/35 hover:shadow",
          confirmed && "border-gray-300 bg-emerald-100",
          unassigned && "border-destructive/50 bg-destructive/5",
          pendingConfirmation && "border-dashed border-violet-400 bg-violet-100",
          className
        )}
      >
        <span className="absolute bottom-1.5 right-1.5 rounded bg-muted px-2 py-1 text-[9px] font-semibold leading-none tabular-nums text-muted-foreground">
          {durationMinutes} min
        </span>
        <div className="truncate font-semibold text-foreground">{customerName}</div>
        <div className="mt-1 truncate pr-14 text-[10px] font-medium text-muted-foreground">
          {serviceName}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-md border px-2 py-1.5 text-left text-xs shadow-sm transition-colors hover:bg-accent",
        confirmed && "border-gray-300 bg-emerald-100",
        unassigned && "border-destructive/50 bg-destructive/5",
        pendingConfirmation && "border-dashed border-violet-400 bg-violet-100",
        className
      )}
    >
      <div className="font-medium">{durationMinutes} min</div>
      <div className="truncate text-muted-foreground">
        {customerName} · {address}
      </div>
      <div className="truncate font-medium">{serviceName}</div>
      {employeeName && <div className="truncate text-muted-foreground">{employeeName}</div>}
      {pendingConfirmation && (
        <div className="mt-1 flex items-center gap-1 truncate text-violet-600 dark:text-violet-400">
          <CircleDashed className="h-3 w-3 shrink-0" />
          <span className="truncate">Da confermare</span>
        </div>
      )}
    </div>
  );
}
