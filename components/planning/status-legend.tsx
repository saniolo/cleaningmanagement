import { cn } from "@/lib/utils";

const LEGEND_ITEMS = [
  { label: "Confermata", dotClassName: "border-gray-300 bg-emerald-100" },
  { label: "Da confermare", dotClassName: "border-dashed border-violet-400 bg-violet-100" },
  { label: "Assente", dotClassName: "border-amber-200 bg-amber-50" },
] as const;

// Explains the grid's card colors once, here, instead of repeating a text
// label on every single card — a color-coded dot next to each state name.
export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full border", item.dotClassName)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
