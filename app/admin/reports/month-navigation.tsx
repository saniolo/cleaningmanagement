import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { currentMonthString, shiftMonthString } from "@/lib/dates";

interface MonthNavigationProps {
  month: string;
  basePath: string;
}

export function MonthNavigation({ month, basePath }: MonthNavigationProps) {
  const prevMonth = shiftMonthString(month, -1);
  const nextMonth = shiftMonthString(month, 1);

  return (
    <nav
      aria-label="Navigazione mensile"
      className="flex h-9 items-stretch overflow-hidden rounded-md border bg-background shadow-sm"
    >
      <Link
        href={`${basePath}?month=${prevMonth}`}
        className="flex items-center gap-1.5 border-r px-3 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Precedente
      </Link>
      <Link
        href={`${basePath}?month=${currentMonthString()}`}
        className="flex items-center border-r px-3 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Mese corrente
      </Link>
      <Link
        href={`${basePath}?month=${nextMonth}`}
        className="flex items-center gap-1.5 px-3 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Successivo
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </nav>
  );
}
