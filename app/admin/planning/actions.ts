"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { addDaysToDateValue, dateStringToDateValue } from "@/lib/dates";
import {
  assignmentSchema,
  createAssignmentSchema,
  type AssignmentInput,
  type CreateAssignmentInput,
} from "@/lib/validation/assignment";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

function revalidatePlanningViews() {
  revalidatePath("/admin/planning");
  revalidatePath("/admin/unassigned");
  // A direct assignment can cancel a pending replacement request (see
  // updateAssignment below), which changes the proposed employee's
  // pending-count badge in their nav.
  revalidatePath("/app/[token]", "layout");
}

export async function createAssignment(input: CreateAssignmentInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, companyId: admin.companyId },
  });
  if (!service) return { success: false, error: "Servizio non trovato." };

  const date = dateStringToDateValue(parsed.data.date);

  if (parsed.data.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, companyId: admin.companyId, active: true },
    });
    if (!employee) return { success: false, error: "Dipendente non trovato." };
  }

  await prisma.assignment.create({
    data: {
      companyId: admin.companyId,
      serviceId: service.id,
      date,
      durationMinutes: parsed.data.durationMinutes,
      employeeId: parsed.data.employeeId ?? null,
      status: parsed.data.employeeId ? "ASSIGNED" : "UNASSIGNED",
    },
  });

  revalidatePlanningViews();
  return { success: true, data: undefined };
}

export async function updateAssignment(id: string, input: AssignmentInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.assignment.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Attività non trovata." };

  const date = dateStringToDateValue(parsed.data.date);

  if (parsed.data.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, companyId: admin.companyId, active: true },
    });
    if (!employee) return { success: false, error: "Dipendente non trovato." };
  }

  await prisma.$transaction([
    prisma.assignment.update({
      where: { id },
      data: {
        date,
        durationMinutes: parsed.data.durationMinutes,
        employeeId: parsed.data.employeeId ?? null,
        status: parsed.data.employeeId ? "ASSIGNED" : "UNASSIGNED",
      },
    }),
    // Directly assigning someone fills the slot, so any pending replacement
    // proposal for it is now moot — cancel it rather than leaving it
    // dangling. Without this, an employee could still see (and act on) a
    // stale "Accetta/Rifiuta" prompt for an activity someone else already
    // took, and rejecting it would silently do nothing useful since the
    // activity was never theirs to free up.
    ...(parsed.data.employeeId
      ? [
          prisma.replacementRequest.updateMany({
            where: { assignmentId: id, status: "PENDING" },
            data: { status: "CANCELLED", respondedAt: new Date() },
          }),
        ]
      : []),
  ]);

  revalidatePlanningViews();
  return { success: true, data: undefined };
}

// Explicit, one-shot copy — the whole point is to replace "the system
// decides who's recurring where" with "the admin decides, once a week,
// what next week looks like starting from this week." Copies every ASSIGNED
// activity in [weekStart, weekStart+6] to the same weekday/employee exactly
// 7 days later — cloning again next week is just clicking the button again,
// not something the system keeps doing on its own.
//
// A service can still have its own active RecurringSchedule (unrelated to
// this button — see lib/scheduling/generate.ts), which independently keeps
// generating that service's own UNASSIGNED occurrences on a rolling
// horizon. If one of those already sits on the exact target date for the
// same service, this fills it in directly instead of creating a second row
// next to it — two rows for the same service on the same date would show
// as a real duplicate activity on the grid, one covered and one not (a
// service+date is the full identity of an occurrence now that there's no
// time of day to further distinguish it). A target date already covered by
// someone else is skipped rather than overwritten, same as every other
// direct-assignment path in this app — there's no other reason to skip
// since assigning someone to more than one activity on the same day is no
// longer blocked.
export async function cloneWeekToNextWeek(
  weekStartDate: string
): Promise<ActionResult<{ clonedCount: number; skippedCount: number }>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const weekStart = dateStringToDateValue(weekStartDate);
  const weekEnd = addDaysToDateValue(weekStart, 6);

  const assignments = await prisma.assignment.findMany({
    where: {
      companyId: admin.companyId,
      status: "ASSIGNED",
      employeeId: { not: null },
      date: { gte: weekStart, lte: weekEnd },
    },
  });

  if (assignments.length === 0) {
    return { success: false, error: "Nessuna attività assegnata da clonare in questa settimana." };
  }

  let clonedCount = 0;
  for (const a of assignments) {
    const targetDate = addDaysToDateValue(a.date, 7);

    const existingAtTarget = await prisma.assignment.findFirst({
      where: {
        companyId: admin.companyId,
        serviceId: a.serviceId,
        date: targetDate,
      },
    });

    if (existingAtTarget) {
      if (existingAtTarget.status === "ASSIGNED") continue; // already covered
      await prisma.assignment.update({
        where: { id: existingAtTarget.id },
        data: { employeeId: a.employeeId, status: "ASSIGNED" },
      });
    } else {
      await prisma.assignment.create({
        data: {
          companyId: admin.companyId,
          serviceId: a.serviceId,
          date: targetDate,
          durationMinutes: a.durationMinutes,
          employeeId: a.employeeId,
          status: "ASSIGNED",
        },
      });
    }
    clonedCount++;
  }

  revalidatePlanningViews();

  if (clonedCount === 0) {
    return {
      success: false,
      error: "Nessuna attività copiata: la settimana successiva ha già tutte le stesse attività.",
    };
  }

  return {
    success: true,
    data: { clonedCount, skippedCount: assignments.length - clonedCount },
  };
}
