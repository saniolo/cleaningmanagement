import { cn } from "@/lib/utils";

// Darker/more saturated than the actual card colors on purpose — the pale
// card backgrounds (emerald-100, amber-50...) wash out at this small a
// size, so the swatch uses a bolder shade of the same color family instead
// of literally matching the card.
const LEGEND_ITEMS = [
  { label: "Confermata", dotClassName: "border-emerald-500 bg-emerald-500" },
  { label: "Da confermare", dotClassName: "border-violet-500 bg-violet-500" },
  { label: "Assente", dotClassName: "border-amber-500 bg-amber-500" },
  { label: "Assenza da approvare", dotClassName: "border-red-500 bg-red-500" },
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
