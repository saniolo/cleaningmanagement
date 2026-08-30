import type { ReactNode } from "react";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AutoRefresh } from "@/components/shared/auto-refresh";

// Server-side role enforcement already happens in middleware.ts (matcher
// "/admin/:path*"), which redirects to /login unless the session's role is
// ADMIN. This layout only renders the shell.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  const pendingAbsencesCount = admin
    ? await prisma.absenceRequest.count({
        where: { companyId: admin.companyId, status: "PENDING" },
      })
    : 0;

  return (
    <>
      <AutoRefresh />
      <AdminShell pendingAbsencesCount={pendingAbsencesCount}>{children}</AdminShell>
    </>
  );
}
