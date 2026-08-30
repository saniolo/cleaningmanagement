"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { EmployeeAssignmentCard } from "./employee-assignment-card";

export interface EmployeeDayAssignment {
  id: string;
  durationMinutes: number;
  customerName: string;
  address: string;
  serviceName: string;
  operationalNotes?: string;
  requiresConfirmation?: boolean;
  confirmedAt?: Date | null;
}

export interface EmployeeDay {
  dateStr: string;
  shortLabel: string;
  dayNumber: number;
  dateLabel: string;
  isToday: boolean;
  assignments: EmployeeDayAssignment[];
}

// A one-day-at-a-time, swipeable view instead of all seven days stacked
// vertically — lands on today so "what do I have now" is the first thing
// shown, and lets a finger swipe (or the tab row) move to any other day of
// the week already loaded, without a page navigation per day.
export function EmployeeDayPager({ days }: { days: EmployeeDay[] }) {
  const initialIndex = Math.max(
    0,
    days.findIndex((d) => d.isToday)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  // Runs before paint: jumps straight to today's panel so there's no
  // visible flash of Monday before it snaps over.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    isProgrammaticScroll.current = true;
    el.scrollLeft = initialIndex * el.clientWidth;
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
    // Only ever run this once, for the initial position — re-running on
    // every render would fight the user's own scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollToIndex(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    isProgrammaticScroll.current = true;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || isProgrammaticScroll.current) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex((current) => (current === index ? current : index));
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {days.map((day, index) => (
          <button
            key={day.dateStr}
            type="button"
            onClick={() => scrollToIndex(index)}
            className={cn(
              "relative flex shrink-0 flex-col items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              index === activeIndex
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-[10px] uppercase tracking-wide">{day.shortLabel}</span>
            <span className="text-sm font-semibold tabular-nums">{day.dayNumber}</span>
            {day.isToday && index !== activeIndex && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {days.map((day) => (
          <div key={day.dateStr} className="w-full shrink-0 snap-center px-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {day.dateLabel}
            </h2>
            {day.assignments.length === 0 ? (
              <EmptyState title="Nessuna attività in programma." />
            ) : (
              <div className="space-y-2">
                {day.assignments.map((a) => (
                  <EmployeeAssignmentCard
                    key={a.id}
                    dateLabel={day.dateLabel}
                    durationMinutes={a.durationMinutes}
                    customerName={a.customerName}
                    address={a.address}
                    serviceName={a.serviceName}
                    operationalNotes={a.operationalNotes}
                    requiresConfirmation={a.requiresConfirmation}
                    confirmedAt={a.confirmedAt}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
