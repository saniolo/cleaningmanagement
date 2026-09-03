"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

function revalidateAbsenceViews() {
  revalidatePath("/admin/absences");
  revalidatePath("/admin/planning");
}

// PROJECT_SPEC.md section 17: approving an absence must, in one atomic step,
// (1) mark the request approved and (2) free every ASSIGNED assignment this
// employee held in the absence's date range back to UNASSIGNED — never
// delete the assignment itself, the service obligation still exists. Both
// writes go through prisma.$transaction so a crash between them can't leave
// an approved absence with the employee still showing as assigned.
//
// Each freed occurrence also gets stamped with freedByAbsenceId: once
// employeeId is cleared there's otherwise nothing left tying those hours to
// this employee, and the monthly hours report needs that link to total the
// hours lost to ferie / permessi / malattia. The stamp survives the shift
// later being reassigned to someone else to cover.
export async function approveAbsenceRequest(
  id: string
): Promise<ActionResult<{ impacted: number }>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const absence = await prisma.absenceRequest.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!absence) return { success: false, error: "Richiesta di assenza non trovata." };
  if (absence.status !== "PENDING") {
    return { success: false, error: "Questa richiesta è già stata gestita." };
  }

  const [, impacted] = await prisma.$transaction([
    prisma.absenceRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedBy: admin.id, reviewedAt: new Date() },
    }),
    prisma.assignment.updateMany({
      where: {
        employeeId: absence.employeeId,
        status: "ASSIGNED",
        date: { gte: absence.startDate, lte: absence.endDate },
      },
      data: { employeeId: null, status: "UNASSIGNED", freedByAbsenceId: id },
    }),
  ]);

  revalidateAbsenceViews();
  return { success: true, data: { impacted: impacted.count } };
}

export async function rejectAbsenceRequest(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const absence = await prisma.absenceRequest.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!absence) return { success: false, error: "Richiesta di assenza non trovata." };
  if (absence.status !== "PENDING") {
    return { success: false, error: "Questa richiesta è già stata gestita." };
  }

  await prisma.absenceRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedBy: admin.id, reviewedAt: new Date() },
  });

  revalidateAbsenceViews();
  return { success: true, data: undefined };
}
