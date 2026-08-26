import { prisma } from "@/lib/db";

// "Obvious" time-overlap detection per PROJECT_SPEC.md section 12 — no
// travel-time modeling, just: does this employee already have another
// ASSIGNED assignment on the same date whose [startTime, endTime) overlaps
// the proposed one? Standard interval overlap: existing.start < new.end AND
// existing.end > new.start.
export async function hasSchedulingConflict(
  employeeId: string,
  date: Date,
  startTime: Date,
  endTime: Date,
  excludeAssignmentId?: string
): Promise<boolean> {
  const overlapping = await prisma.assignment.findFirst({
    where: {
      employeeId,
      date,
      status: "ASSIGNED",
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });

  return !!overlapping;
}
