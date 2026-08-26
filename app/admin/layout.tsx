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
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
