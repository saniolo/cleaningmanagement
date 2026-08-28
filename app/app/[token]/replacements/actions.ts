"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";
const STALE_ERROR = "La richiesta di sostituzione non è più disponibile.";
const TAKEN_ERROR = "Questa attività è già stata assegnata.";

// PROJECT_SPEC.md section 19: accepting a replacement must re-verify, right
// before writing, that (1) the request is still PENDING and (2) the
// assignment is still UNASSIGNED — then flip both records atomically. Two
// employees can never both end up assigned to the same activity: the
// conditional updateMany()s below only affect a row if it's still in the
// expected state, so if two accepts race, the second one's update matches 0
// rows and fails cleanly instead of overwriting the first.
export async function acceptReplacementRequest(
  token: string,
  replacementRequestId: string
): Promise<ActionResult> {
  const employee = await resolveEmployeeByToken(token);
  if (!employee) return { success: false, error: PERMISSION_ERROR };

  const replacement = await prisma.replacementRequest.findFirst({
    where: { id: replacementRequestId, proposedEmployeeId: employee.id },
    include: { assignment: true },
  });
  if (!replacement) return { success: false, error: STALE_ERROR };
  if (replacement.status !== "PENDING") return { success: false, error: STALE_ERROR };
  if (replacement.assignment.status !== "UNASSIGNED" || replacement.assignment.employeeId) {
    return { success: false, error: TAKEN_ERROR };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const requestUpdate = await tx.replacementRequest.updateMany({
        where: { id: replacementRequestId, status: "PENDING" },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      if (requestUpdate.count === 0) throw new Error("STALE");

      const assignmentUpdate = await tx.assignment.updateMany({
        where: { id: replacement.assignmentId, status: "UNASSIGNED" },
        data: { employeeId: employee.id, status: "ASSIGNED" },
      });
      if (assignmentUpdate.count === 0) throw new Error("TAKEN");
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STALE") {
      return { success: false, error: STALE_ERROR };
    }
    if (error instanceof Error && error.message === "TAKEN") {
      return { success: false, error: TAKEN_ERROR };
    }
    throw error;
  }

  revalidatePath(`/app/${token}/replacements`);
  revalidatePath(`/app/${token}`);
  // The pending-count badge in the nav lives in the layout, which client-side
  // navigation won't otherwise re-fetch — revalidate it explicitly so it
  // drops immediately instead of staying stale until the next full load.
  revalidatePath("/app/[token]", "layout");
  revalidatePath("/admin/unassigned");
  revalidatePath("/admin/planning");
  return { success: true, data: undefined };
}

export async function rejectReplacementRequest(
  token: string,
  replacementRequestId: string
): Promise<ActionResult> {
  const employee = await resolveEmployeeByToken(token);
  if (!employee) return { success: false, error: PERMISSION_ERROR };

  // Assignment stays UNASSIGNED — it already is, nothing to touch there —
  // and immediately available for another proposal (section 20).
  const updated = await prisma.replacementRequest.updateMany({
    where: { id: replacementRequestId, proposedEmployeeId: employee.id, status: "PENDING" },
    data: { status: "REJECTED", respondedAt: new Date() },
  });
  if (updated.count === 0) return { success: false, error: STALE_ERROR };

  revalidatePath(`/app/${token}/replacements`);
  revalidatePath("/app/[token]", "layout");
  revalidatePath("/admin/unassigned");
  return { success: true, data: undefined };
}
