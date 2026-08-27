"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { hasSchedulingConflict } from "@/lib/scheduling/conflicts";
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

  const conflict = await hasSchedulingConflict(
    employeeId,
    assignment.date,
    assignment.startTime,
    assignment.endTime
  );
  if (conflict) {
    return { success: false, error: "Il dipendente non è disponibile in questo orario." };
  }

  await prisma.replacementRequest.create({
    data: {
      companyId: admin.companyId,
      assignmentId,
      proposedEmployeeId: employeeId,
      status: "PENDING",
    },
  });

  revalidatePath("/admin/unassigned");
  return { success: true, data: undefined };
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
  return { success: true, data: undefined };
}
