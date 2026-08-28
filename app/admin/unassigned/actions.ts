"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

// PROJECT_SPEC.md section 18: manager proposes an uncovered assignment to
// one employee at a time. Re-verifies eligibility server-side — the
// employee list the dialog showed was already filtered, but never trust
// that a client-side filter still holds by the time the request lands.
export async function proposeReplacement(
  assignmentId: string,
  employeeId: string
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, companyId: admin.companyId, status: "UNASSIGNED" },
  });
  if (!assignment) return { success: false, error: "Questa attività è già stata assegnata." };

  const existingPending = await prisma.replacementRequest.findFirst({
    where: { assignmentId, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) {
    return { success: false, error: "Esiste già una proposta in attesa per questa attività." };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: admin.companyId, active: true },
  });
  if (!employee) return { success: false, error: "Dipendente non trovato." };

  await prisma.replacementRequest.create({
    data: {
      companyId: admin.companyId,
      assignmentId,
      proposedEmployeeId: employeeId,
      status: "PENDING",
    },
  });

  revalidatePath("/admin/unassigned");
  revalidatePath("/admin/planning");
  // Refreshes the proposed employee's pending-count badge in their nav.
  revalidatePath("/app/[token]", "layout");
  return { success: true, data: undefined };
}

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

  for (const assignment of assignments) {
    await prisma.$transaction([
      prisma.assignment.update({
        where: { id: assignment.id },
        data: { employeeId, status: "ASSIGNED" },
      }),
      prisma.replacementRequest.updateMany({
        where: { assignmentId: assignment.id, status: "PENDING" },
        data: { status: "CANCELLED", respondedAt: new Date() },
      }),
    ]);
  }

  revalidatePath("/admin/unassigned");
  revalidatePath("/admin/planning");
  revalidatePath("/app/[token]", "layout");

  return { success: true, data: { assignedCount: assignments.length } };
}

export async function cancelReplacementRequest(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const updated = await prisma.replacementRequest.updateMany({
    where: { id, companyId: admin.companyId, status: "PENDING" },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });
  if (updated.count === 0) {
    return { success: false, error: "Richiesta non trovata o già gestita." };
  }

  revalidatePath("/admin/unassigned");
  revalidatePath("/admin/planning");
  revalidatePath("/app/[token]", "layout");
  return { success: true, data: undefined };
}
