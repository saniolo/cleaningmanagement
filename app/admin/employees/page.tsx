import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { startOfUtcDay } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "./employee-form";
import { EmployeesTable } from "./employees-table";

export default async function EmployeesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const today = startOfUtcDay(new Date());

  const [employees, currentAbsences] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: admin.companyId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.absenceRequest.findMany({
      where: {
        companyId: admin.companyId,
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
  ]);

  const currentAbsenceByEmployeeId = new Map(
    currentAbsences.map((a) => [a.employeeId, { type: a.type, endDate: a.endDate }])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dipendenti"
        description="Anagrafica dipendenti e link personali di accesso."
        actions={<EmployeeForm trigger={<Button>Nuovo dipendente</Button>} />}
      />

      {employees.length === 0 ? (
        <EmptyState title="Nessun dipendente presente." />
      ) : (
        <EmployeesTable
          employees={employees}
          currentAbsenceByEmployeeId={Object.fromEntries(currentAbsenceByEmployeeId)}
        />
      )}
    </div>
  );
}
