"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

export function AdminShell({
  children,
  pendingAbsencesCount = 0,
}: {
  children: React.ReactNode;
  pendingAbsencesCount?: number;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";
  const isPlanning = pathname.startsWith("/admin/planning");

  // Aperto di default solo nella dashboard (/admin), chiuso nelle altre
  // pagine — si ripristina a questa regola a ogni cambio di pagina, ma
  // resta comunque possibile aprirlo/chiuderlo manualmente per la pagina
  // corrente tramite il pulsante.
  const [collapsed, setCollapsed] = useState(!isDashboard);

  useEffect(() => {
    setCollapsed(!isDashboard);
  }, [isDashboard]);

  function toggleSidebar() {
    setCollapsed((current) => !current);
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
          collapsed ? "w-16" : "w-60"
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
