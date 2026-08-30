import { CalendarDays } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  greeting: string;
  dateLabel: string;
}

export function DashboardHeader({ title, greeting, dateLabel }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{greeting}</p>
      </div>

      <span className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 sm:self-auto">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        {dateLabel}
      </span>
    </header>
  );
}
