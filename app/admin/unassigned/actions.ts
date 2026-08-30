"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

// Lets the manager assign one employee to several occurrences of the same
// recurring schedule at once (e.g. "Pulizia scale" every Monday, 6 weeks
// still uncovered) instead of opening each date's dialog individually.
// Always assigns every occurrence passed in — there's no more time-overlap
// concept to skip on, and an admin assigning directly already overrides
// absence the same way a single direct assignment does.
export async function bulkAssignEmployee(
  assignmentIds: string[],
  employeeId: string
): Promise<ActionResult<{ assignedCount: number }>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: admin.companyId, active: true },
  });
  if (!employee) return { success: false, error: "Dipendente non trovato." };

  const assignments = await prisma.assignment.findMany({
    where: { id: { in: assignmentIds }, companyId: admin.companyId, status: "UNASSIGNED" },
  });
  if (assignments.length === 0) {
    return { success: false, error: "Nessuna di queste attività è ancora da assegnare." };
  }

  await prisma.assignment.updateMany({
    where: { id: { in: assignments.map((a) => a.id) } },
    data: { employeeId, status: "ASSIGNED" },
  });

  revalidatePath("/admin/unassigned");
  revalidatePath("/admin/planning");
  revalidatePath("/app/[token]", "layout");

  return { success: true, data: { assignedCount: assignments.length } };
}
