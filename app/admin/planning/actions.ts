"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { hasSchedulingConflict } from "@/lib/scheduling/conflicts";
import { dateStringToDateValue, timeStringToTimeValue } from "@/lib/dates";
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
  const startTime = timeStringToTimeValue(parsed.data.startTime);
  const endTime = timeStringToTimeValue(parsed.data.endTime);

  if (parsed.data.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, companyId: admin.companyId, active: true },
    });
    if (!employee) return { success: false, error: "Dipendente non trovato." };

    const conflict = await hasSchedulingConflict(parsed.data.employeeId, date, startTime, endTime);
    if (conflict) {
      return { success: false, error: "Il dipendente non è disponibile in questo orario." };
    }
  }

  await prisma.assignment.create({
    data: {
      companyId: admin.companyId,
      serviceId: service.id,
      date,
      startTime,
      endTime,
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
  const startTime = timeStringToTimeValue(parsed.data.startTime);
  const endTime = timeStringToTimeValue(parsed.data.endTime);

  if (parsed.data.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, companyId: admin.companyId, active: true },
    });
    if (!employee) return { success: false, error: "Dipendente non trovato." };

    const conflict = await hasSchedulingConflict(
      parsed.data.employeeId,
      date,
      startTime,
      endTime,
      id
    );
    if (conflict) {
      return { success: false, error: "Il dipendente non è disponibile in questo orario." };
    }
  }

  await prisma.assignment.update({
    where: { id },
    data: {
      date,
      startTime,
      endTime,
      employeeId: parsed.data.employeeId ?? null,
      status: parsed.data.employeeId ? "ASSIGNED" : "UNASSIGNED",
    },
  });

  revalidatePlanningViews();
  return { success: true, data: undefined };
}
