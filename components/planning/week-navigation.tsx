import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { addDaysToDateValue, dateValueToDateString } from "@/lib/dates";

interface WeekNavigationProps {
  weekStart: Date;
  basePath: string;
}

export function WeekNavigation({ weekStart, basePath }: WeekNavigationProps) {
  const prevWeek = dateValueToDateString(addDaysToDateValue(weekStart, -7));
  const nextWeek = dateValueToDateString(addDaysToDateValue(weekStart, 7));

  return (
    <nav
      aria-label="Navigazione settimanale"
      className="flex h-9 items-stretch overflow-hidden rounded-md border bg-background shadow-sm"
    >
        <Link
          href={`${basePath}?week=${prevWeek}`}
          className="flex items-center gap-1.5 border-r px-3 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Precedente
        </Link>
        <Link
          href={basePath}
          className="flex items-center border-r px-3 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Oggi
        </Link>
        <Link
          href={`${basePath}?week=${nextWeek}`}
          className="flex items-center gap-1.5 px-3 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Successiva
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
    </nav>
  );
}
