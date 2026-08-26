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

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col justify-between p-4">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-muted-foreground"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        Esci
      </Button>
    </nav>
  );
}
