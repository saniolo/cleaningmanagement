import type { ReactNode } from "react";

import { EmployeeNav } from "@/components/employee/employee-nav";

// No session/auth guard here on purpose: the employee dashboard is reached
// via a personal, unguessable access-token link, not a login (see the
// approved plan's "Accesso dipendenti" decision). Token resolution against
// the Employee table (404 if not found/inactive) lands in Milestone 1,
// once the Employee model has real data — this layout is shell-only.
export default function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { token: string };
}) {
  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto max-w-md p-4">{children}</main>
      <EmployeeNav token={params.token} />
    </div>
  );
}
