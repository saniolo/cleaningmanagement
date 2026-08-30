"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";
const STALE_ERROR = "Attività non trovata o già gestita.";

function revalidateAfterResponse(token: string) {
  revalidatePath(`/app/${token}`);
  // The pending-count badge in the nav lives in the layout, which client-side
  // navigation won't otherwise re-fetch — revalidate it explicitly so it
  // drops immediately instead of staying stale until the next full load.
  revalidatePath("/app/[token]", "layout");
  revalidatePath("/admin/planning");
  revalidatePath("/admin/unassigned");
}

// Conditional updateMany, not findFirst+update: only affects the row if
// it's still exactly the state the employee saw (assigned to them, still
// pending) — if the admin reassigned it or unset requiresConfirmation in
// the meantime, this matches 0 rows and fails cleanly instead of
// resurrecting a confirmation for an activity that changed underneath it.
export async function confirmAssignment(
  token: string,
  assignmentId: string
): Promise<ActionResult> {
  const employee = await resolveEmployeeByToken(token);
  if (!employee) return { success: false, error: PERMISSION_ERROR };

  const updated = await prisma.assignment.updateMany({
    where: {
      id: assignmentId,
      employeeId: employee.id,
      status: "ASSIGNED",
      requiresConfirmation: true,
      confirmedAt: null,
    },
    data: { confirmedAt: new Date() },
  });
  if (updated.count === 0) {
    return { success: false, error: STALE_ERROR };
  }

  revalidateAfterResponse(token);
  return { success: true, data: undefined };
}

// Rejecting a pending-confirmation activity is the same outcome as
// rejecting the old replacement proposals it replaced: the activity goes
// back to UNASSIGNED for the admin to hand to someone else, not tracked as
// "rejected by X" — once nobody owns it, who last said no isn't part of
// the assignment's state.
export async function rejectAssignment(
  token: string,
  assignmentId: string
): Promise<ActionResult> {
  const employee = await resolveEmployeeByToken(token);
  if (!employee) return { success: false, error: PERMISSION_ERROR };

  const updated = await prisma.assignment.updateMany({
    where: {
      id: assignmentId,
      employeeId: employee.id,
      status: "ASSIGNED",
      requiresConfirmation: true,
      confirmedAt: null,
    },
    data: {
      employeeId: null,
      status: "UNASSIGNED",
      requiresConfirmation: false,
      confirmedAt: null,
    },
  });
  if (updated.count === 0) {
    return { success: false, error: STALE_ERROR };
  }

  revalidateAfterResponse(token);
  return { success: true, data: undefined };
}
