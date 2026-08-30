import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { addDaysToDateValue, dateValueToDateString } from "@/lib/dates";

// Compact, icon-only prev/next around the date range — the three-word
// "Precedente / Oggi / Successiva" bar used in the admin planning grid
// doesn't fit comfortably in the narrow mobile-first employee dashboard.
// Tapping the range label itself resets to the current week, same as "Oggi".
export function EmployeeWeekNav({
  token,
  weekStart,
  rangeLabel,
}: {
  token: string;
  weekStart: Date;
  rangeLabel: string;
}) {
  const base = `/app/${token}`;
  const prevWeek = dateValueToDateString(addDaysToDateValue(weekStart, -7));
  const nextWeek = dateValueToDateString(addDaysToDateValue(weekStart, 7));

  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`${base}?week=${prevWeek}`}
        aria-label="Settimana precedente"
        className="rounded-md border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <Link
        href={base}
        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {rangeLabel}
      </Link>
      <Link
        href={`${base}?week=${nextWeek}`}
        aria-label="Settimana successiva"
        className="rounded-md border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
