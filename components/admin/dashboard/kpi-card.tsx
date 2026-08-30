import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type Tone = "indigo" | "blue" | "green";

// Full literal class strings so Tailwind's JIT keeps them — the tone only
// tints the icon tile and the small state dots, never a whole card.
const TONE: Record<Tone, { tile: string; dot: string }> = {
  indigo: { tile: "bg-indigo-50 text-indigo-600", dot: "bg-indigo-500" },
  blue: { tile: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  green: { tile: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
};

interface KpiCardProps {
  href?: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
  value: number;
  /** Preview list or elegant empty state, rendered below the divider. */
  children?: ReactNode;
}

export function KpiCard({ href, icon: Icon, tone, title, subtitle, value, children }: KpiCardProps) {
  const toneClasses = TONE[tone];

  const card = (
    <Card
      className={cn(
        "group flex h-full flex-col rounded-2xl border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        href &&
          "transition-[box-shadow,border-color] duration-150 group-hover:border-slate-300 group-hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", toneClasses.tile)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        {href && (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-400" />
        )}
      </div>

      <div className="mt-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-400">{subtitle}</div>
      </div>

      <div className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>

      {children && <div className="mt-4 border-t border-slate-100 pt-3">{children}</div>}
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 rounded-2xl">
      {card}
    </Link>
  );
}

/** A single preview row: small tone dot + truncated muted text. */
export function KpiPreviewRow({ tone = "indigo", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-slate-600">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE[tone].dot)} />
      <span className="truncate">{children}</span>
    </li>
  );
}

export function KpiPreviewMore({ children }: { children: ReactNode }) {
  return <li className="pl-3.5 text-xs font-medium text-slate-400">{children}</li>;
}
