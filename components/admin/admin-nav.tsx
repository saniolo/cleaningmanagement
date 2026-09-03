"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarDays, Clock, LayoutDashboard, LogOut, Users, UserSquare2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/planning", label: "Pianificazione", icon: CalendarDays },
  { href: "/admin/employees", label: "Dipendenti", icon: Users },
  { href: "/admin/customers", label: "Clienti e attività", icon: UserSquare2 },
  { href: "/admin/absences", label: "Assenze", icon: CalendarDays },
  { href: "/admin/reports", label: "Riepilogo ore", icon: Clock },
];

export function AdminNav({
  collapsed = false,
  pendingAbsencesCount = 0,
}: {
  collapsed?: boolean;
  pendingAbsencesCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex h-full flex-col justify-between py-4", collapsed ? "px-2" : "px-4")}>
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          const badgeCount = href === "/admin/absences" ? pendingAbsencesCount : 0;

          return (
            <li key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={cn(
                  "flex h-10 items-center rounded-[10px] text-sm font-medium transition-colors duration-150",
                  collapsed ? "justify-center px-0" : "gap-2 px-3",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span className="relative shrink-0">
                  <Icon className={cn("h-4 w-4", isActive && "text-indigo-600")} />
                  {collapsed && badgeCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-destructive-foreground">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && badgeCount > 0 && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Button
        variant="ghost"
        size="sm"
        title={collapsed ? "Esci" : undefined}
        aria-label={collapsed ? "Esci" : undefined}
        className={cn(
          "text-muted-foreground",
          collapsed ? "justify-center px-0" : "justify-start gap-2"
        )}
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && "Esci"}
      </Button>
    </nav>
  );
}
