import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

// Server-side role enforcement already happens in middleware.ts (matcher
// "/admin/:path*"), which redirects to /login unless the session's role is
// ADMIN. This layout only renders the shell.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r">
        <AdminNav />
      </aside>
      {/* min-w-0 is load-bearing: without it a flex child never shrinks
          below its content's natural width, so wide content (the planning
          grid) pushed the whole page wider than the viewport instead of
          scrolling inside its own container (the Table component's own
          overflow-auto wrapper, once this can actually constrain it). */}
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
