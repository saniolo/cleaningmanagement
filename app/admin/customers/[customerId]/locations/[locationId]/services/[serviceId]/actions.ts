"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  recurringScheduleSchema,
  type RecurringScheduleInput,
} from "@/lib/validation/recurring-schedule";
import { dateStringToDateValue, timeStringToTimeValue } from "@/lib/dates";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

function pathFor(customerId: string, locationId: string, serviceId: string) {
  return `/admin/customers/${customerId}/locations/${locationId}/services/${serviceId}`;
}

async function assertServiceInCompany(serviceId: string, locationId: string, companyId: string) {
  return prisma.service.findFirst({
    where: { id: serviceId, locationId, companyId },
  });
}

export async function createRecurringSchedule(
  customerId: string,
  locationId: string,
  serviceId: string,
  input: RecurringScheduleInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const service = await assertServiceInCompany(serviceId, locationId, admin.companyId);
  if (!service) return { success: false, error: "Servizio non trovato." };

  const parsed = recurringScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.recurringSchedule.create({
    data: {
      companyId: admin.companyId,
      serviceId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: timeStringToTimeValue(parsed.data.startTime),
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      effectiveFrom: dateStringToDateValue(parsed.data.effectiveFrom),
      effectiveUntil: parsed.data.effectiveUntil
        ? dateStringToDateValue(parsed.data.effectiveUntil)
        : null,
    },
  });

  revalidatePath(pathFor(customerId, locationId, serviceId));
  return { success: true, data: undefined };
}

export async function updateRecurringSchedule(
  customerId: string,
  locationId: string,
  serviceId: string,
  recurringScheduleId: string,
  input: RecurringScheduleInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = recurringScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.recurringSchedule.findFirst({
    where: { id: recurringScheduleId, serviceId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Ricorrenza non trovata." };

  await prisma.recurringSchedule.update({
    where: { id: recurringScheduleId },
    data: {
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: timeStringToTimeValue(parsed.data.startTime),
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      effectiveFrom: dateStringToDateValue(parsed.data.effectiveFrom),
      effectiveUntil: parsed.data.effectiveUntil
        ? dateStringToDateValue(parsed.data.effectiveUntil)
        : null,
    },
  });

  revalidatePath(pathFor(customerId, locationId, serviceId));
  return { success: true, data: undefined };
}

export async function toggleRecurringScheduleActive(
  customerId: string,
  locationId: string,
  serviceId: string,
  recurringScheduleId: string
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.recurringSchedule.findFirst({
    where: { id: recurringScheduleId, serviceId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Ricorrenza non trovata." };

  await prisma.recurringSchedule.update({
    where: { id: recurringScheduleId },
    data: { active: !existing.active },
  });

  revalidatePath(pathFor(customerId, locationId, serviceId));
  return { success: true, data: undefined };
}
