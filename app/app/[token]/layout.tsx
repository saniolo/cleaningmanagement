import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import { EmployeeNav } from "@/components/employee/employee-nav";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { DottedBackground } from "@/components/shared/dotted-background";

// No session/auth guard here on purpose: the employee dashboard is reached
// via a personal, unguessable access-token link, not a login (see the
// approved plan's "Accesso dipendenti" decision). Identity is resolved from
// the token server-side on every request; an unknown/inactive token 404s
// with no distinguishing message, so a guess can't be used to probe for
// valid tokens.
export default async function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { token: string };
}) {
  const employee = await resolveEmployeeByToken(params.token);

  if (!employee) {
    notFound();
  }

  const pendingConfirmationsCount = await prisma.assignment.count({
    where: {
      employeeId: employee.id,
      status: "ASSIGNED",
      requiresConfirmation: true,
      confirmedAt: null,
    },
  });

  return (
    <div className="relative isolate min-h-screen pb-16">
      <DottedBackground />
      <AutoRefresh />
      <main className="mx-auto max-w-md p-4">{children}</main>
      <EmployeeNav token={params.token} pendingConfirmationsCount={pendingConfirmationsCount} />
    </div>
  );
}
