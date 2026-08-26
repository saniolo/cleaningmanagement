"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Repeat, User, UserSquare2 } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { segment: "", label: "Settimana", icon: CalendarDays },
  { segment: "replacements", label: "Sostituzioni", icon: Repeat },
  { segment: "absences", label: "Assenze", icon: UserSquare2 },
  { segment: "profile", label: "Profilo", icon: User },
];

export function EmployeeNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/app/${token}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background">
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {NAV_ITEMS.map(({ segment, label, icon: Icon }) => {
          const href = segment ? `${base}/${segment}` : base;
          const isActive = pathname === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
