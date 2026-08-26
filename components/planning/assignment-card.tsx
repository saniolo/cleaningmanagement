import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  startTime: string;
  endTime: string;
  customerName: string;
  locationName: string;
  serviceName: string;
  employeeName?: string;
  unassigned?: boolean;
  className?: string;
}

export function AssignmentCard({
  startTime,
  endTime,
  customerName,
  locationName,
  serviceName,
  employeeName,
  unassigned,
  className,
}: AssignmentCardProps) {
  return (
    <div
      className={cn(
        "w-full rounded-md border px-2 py-1.5 text-left text-xs shadow-sm transition-colors hover:bg-accent",
        unassigned && "border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <div className="font-medium">
        {startTime}–{endTime}
      </div>
      <div className="truncate text-muted-foreground">
        {customerName} · {locationName}
      </div>
      <div className="truncate font-medium">{serviceName}</div>
      {employeeName && <div className="truncate text-muted-foreground">{employeeName}</div>}
    </div>
  );
}
