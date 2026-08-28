import { prisma } from "@/lib/db";

export interface EligibleEmployee {
  id: string;
  firstName: string;
  lastName: string;
  assignedCount: number;
  assignedMinutes: number;
}

// "Eligible" for a replacement proposal per PROJECT_SPEC.md section 22:
// active employee, not absent (no APPROVED absence covering the date).
// Scheduling no longer tracks a specific time of day, so there's no overlap
// check to run — instead each eligible employee comes back with their
// existing workload for that date (how many activities, how many minutes)
// so the manager can judge availability by eye rather than have the system
// silently block or allow.
export async function getEligibleEmployees(
  companyId: string,
  date: Date
): Promise<EligibleEmployee[]> {
  const employees = await prisma.employee.findMany({
    where: { companyId, active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const eligible: EligibleEmployee[] = [];
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

    const dayAssignments = await prisma.assignment.findMany({
      where: { employeeId: employee.id, date, status: "ASSIGNED" },
      select: { durationMinutes: true },
    });

    eligible.push({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      assignedCount: dayAssignments.length,
      assignedMinutes: dayAssignments.reduce((sum, a) => sum + a.durationMinutes, 0),
    });
  }

  return eligible;
}
