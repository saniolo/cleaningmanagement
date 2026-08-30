import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface WeekOverviewDay {
  key: string;
  weekday: string;
  dayNum: string;
  total: number;
  unassigned: number;
  isToday: boolean;
}

interface WeekOverviewCardProps {
  days: WeekOverviewDay[];
  planningHref: string;
}

// Fully assigned → emerald, some still open → amber, nothing assigned yet → red.
function dotClass(day: WeekOverviewDay): string {
  if (day.total === 0) return "";
  if (day.unassigned === 0) return "bg-emerald-500";
  if (day.unassigned < day.total) return "bg-amber-500";
  return "bg-red-500";
}

export function WeekOverviewCard({ days, planningHref }: WeekOverviewCardProps) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Pianificazione della settimana</h2>
        <Link
          href={planningHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded"
        >
          Vedi planning
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const dot = dotClass(day);
          return (
            <div
              key={day.key}
              title={day.total > 0 ? `${day.total} attività` : "Nessuna attività"}
              className={cn(
                "min-w-0 rounded-lg border px-1 py-2 text-center",
                day.isToday
                  ? "border-indigo-200 bg-indigo-50/60"
                  : "border-slate-100 bg-slate-50/60"
              )}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {day.weekday}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                {day.dayNum}
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                {day.total === 0 ? (
                  <span className="text-[11px] text-slate-300">—</span>
                ) : (
                  <>
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                    <span className="text-[11px] text-slate-500 tabular-nums">{day.total}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Assegnato
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Parziale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Da assegnare
        </span>
      </div>
    </Card>
  );
}
