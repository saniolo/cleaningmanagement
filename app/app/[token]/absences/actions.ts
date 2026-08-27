"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import { dateStringToDateValue } from "@/lib/dates";
import { absenceRequestSchema, type AbsenceRequestInput } from "@/lib/validation/absence";
import type { ActionResult } from "@/types/actions";

// No session here — identity comes ONLY from the token, re-resolved
// server-side on every call (never trust an employeeId from the client),
// matching the pattern established in Milestone 1.
export async function createAbsenceRequest(
  token: string,
  input: AbsenceRequestInput
): Promise<ActionResult> {
  const employee = await resolveEmployeeByToken(token);
  if (!employee) {
    return {
      success: false,
      error: "Non hai i permessi necessari per eseguire questa operazione.",
    };
  }

  const parsed = absenceRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.absenceRequest.create({
    data: {
      companyId: employee.companyId,
      employeeId: employee.id,
      type: parsed.data.type,
      startDate: dateStringToDateValue(parsed.data.startDate),
      endDate: dateStringToDateValue(parsed.data.endDate),
      notes: parsed.data.notes,
    },
  });

  revalidatePath(`/app/${token}/absences`);
  return { success: true, data: undefined };
}
