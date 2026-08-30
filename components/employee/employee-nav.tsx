"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Repeat, UserSquare2 } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { segment: "", label: "Calendario", icon: CalendarDays },
  { segment: "requests", label: "Richieste", icon: Repeat },
  { segment: "absences", label: "Assenze", icon: UserSquare2 },
];

export function EmployeeNav({
  token,
  pendingConfirmationsCount = 0,
}: {
  token: string;
  pendingConfirmationsCount?: number;
}) {
  const pathname = usePathname();
  const base = `/app/${token}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background">
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {NAV_ITEMS.map(({ segment, label, icon: Icon }) => {
          const href = segment ? `${base}/${segment}` : base;
          const isActive = pathname === href;
          const badgeCount = segment === "requests" ? pendingConfirmationsCount : 0;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
