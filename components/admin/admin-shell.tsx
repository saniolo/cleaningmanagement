"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminShell({
  children,
  pendingAbsencesCount = 0,
}: {
  children: React.ReactNode;
  pendingAbsencesCount?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isPlanning = pathname.startsWith("/admin/planning");

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div
      className={cn(
        "flex bg-[#F7F8FA]",
        isPlanning ? "h-dvh overflow-hidden" : "min-h-screen"
      )}
    >
      <aside
        className={cn(
          "relative h-dvh shrink-0 border-r border-slate-200/80 bg-white transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Espandi menu laterale" : "Comprimi menu laterale"}
          title={collapsed ? "Espandi menu" : "Comprimi menu"}
          className="absolute -right-3 top-5 z-20 grid h-7 w-7 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
        <AdminNav collapsed={collapsed} pendingAbsencesCount={pendingAbsencesCount} />
      </aside>
      <main
        className={cn(
          "min-w-0 flex-1 p-6 2xl:p-8",
          isPlanning && "h-dvh overflow-y-auto xl:overflow-hidden"
        )}
      >
        {children}
      </main>
    </div>
  );
}
