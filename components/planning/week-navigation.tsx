import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { addDaysToDateValue, dateValueToDateString } from "@/lib/dates";
import { Button } from "@/components/ui/button";

interface WeekNavigationProps {
  weekStart: Date;
  basePath: string;
}

export function WeekNavigation({ weekStart, basePath }: WeekNavigationProps) {
  const prevWeek = dateValueToDateString(addDaysToDateValue(weekStart, -7));
  const nextWeek = dateValueToDateString(addDaysToDateValue(weekStart, 7));

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1" asChild>
        <Link href={`${basePath}?week=${prevWeek}`}>
          <ChevronLeft className="h-4 w-4" />
          Precedente
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={basePath}>Oggi</Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-1" asChild>
        <Link href={`${basePath}?week=${nextWeek}`}>
          Successiva
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
