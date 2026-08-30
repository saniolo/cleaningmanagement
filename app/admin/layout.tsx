import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AutoRefresh } from "@/components/shared/auto-refresh";

// Server-side role enforcement already happens in middleware.ts (matcher
// "/admin/:path*"), which redirects to /login unless the session's role is
// ADMIN. This layout only renders the shell.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AutoRefresh />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
