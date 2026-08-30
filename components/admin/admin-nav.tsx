"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Settings,
  Users,
  UserSquare2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/planning", label: "Pianificazione", icon: CalendarDays },
  { href: "/admin/employees", label: "Dipendenti", icon: Users },
  { href: "/admin/customers", label: "Clienti e attività", icon: UserSquare2 },
  { href: "/admin/absences", label: "Assenze", icon: CalendarDays },
  { href: "/admin/unassigned", label: "Attività da assegnare", icon: ListTodo },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
];

export function AdminNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex h-full flex-col justify-between py-4", collapsed ? "px-2" : "px-4")}>
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={cn(
                  "flex h-10 items-center rounded-md text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center px-0" : "gap-2 px-3",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
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
        className={cn("text-muted-foreground", collapsed ? "justify-center px-0" : "justify-start gap-2")}
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && "Esci"}
      </Button>
    </nav>
  );
}
