import { prisma } from "@/lib/db";
import { hasSchedulingConflict } from "@/lib/scheduling/conflicts";

// "Eligible" for a replacement proposal per PROJECT_SPEC.md section 22:
// active employee; not absent (no APPROVED absence covering the date); no
// obvious time overlap. No ranking, no AI, no geographic optimization —
// just this filter, in whatever order Prisma returns employees.
export async function getEligibleEmployees(
  companyId: string,
  date: Date,
  startTime: Date,
  endTime: Date
) {
  const employees = await prisma.employee.findMany({
    where: { companyId, active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const eligible = [];
  for (const employee of employees) {
    const absent = await prisma.absenceRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: "APPROVED",
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true },
    });
    if (absent) continue;

    const conflict = await hasSchedulingConflict(employee.id, date, startTime, endTime);
    if (conflict) continue;

    eligible.push(employee);
  }

  return eligible;
}
