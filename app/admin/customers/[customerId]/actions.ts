"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  serviceSchema,
  serviceScheduleSchema,
  type ServiceInput,
  type ServiceScheduleInput,
} from "@/lib/validation/service";
import { startOfUtcDay } from "@/lib/dates";
import { generateAssignmentsForWindow } from "@/lib/scheduling/generate";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

async function assertCustomerInCompany(customerId: string, companyId: string) {
  return prisma.customer.findFirst({ where: { id: customerId, companyId } });
}

export async function createService(
  customerId: string,
  input: ServiceInput,
  schedule?: ServiceScheduleInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const customer = await assertCustomerInCompany(customerId, admin.companyId);
  if (!customer) return { success: false, error: "Cliente non trovato." };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  let parsedSchedule: ServiceScheduleInput | undefined;
  if (schedule && schedule.daysOfWeek.length > 0) {
    const result = serviceScheduleSchema.safeParse(schedule);
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message ?? "Dati non validi." };
    }
    parsedSchedule = result.data;
  }

  const service = await prisma.service.create({
    data: { ...parsed.data, customerId, companyId: admin.companyId },
  });

  if (parsedSchedule) {
    await prisma.recurringSchedule.createMany({
      data: parsedSchedule.daysOfWeek.map((dayOfWeek) => ({
        companyId: admin.companyId,
        serviceId: service.id,
        dayOfWeek,
        estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
        effectiveFrom: startOfUtcDay(new Date()),
      })),
    });
    // Otherwise a newly-added day sits with no dated occurrence at all
    // until the next cron run — indistinguishable from "this doesn't work"
    // on Pianificazione, since there's simply no card there yet to assign.
    await generateAssignmentsForWindow(admin.companyId);
  }

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true, data: undefined };
}

// Syncs a service's recurring days to exactly the set the admin just
// selected, with one shared duration across all of them — there's no
// separate ricorrenze page anymore for per-day customization, so this is
// the only place that sets a schedule's day and duration. A day that's
// newly checked either reactivates its existing (previously unchecked)
// schedule or creates one from scratch; a day that's unchecked gets
// deactivated rather than deleted, so the activities it already generated
// stay exactly as they are. A day that stays checked has its duration
// updated to match what's on the form, so fixing a wrong duration is just
// editing the service again.
async function syncServiceSchedule(
  companyId: string,
  serviceId: string,
  schedule: ServiceScheduleInput,
  estimatedDurationMinutes: number
) {
  const currentSchedules = await prisma.recurringSchedule.findMany({ where: { serviceId } });
  const desiredDays = new Set(schedule.daysOfWeek);

  for (const s of currentSchedules) {
    if (s.active && !desiredDays.has(s.dayOfWeek)) {
      await prisma.recurringSchedule.update({ where: { id: s.id }, data: { active: false } });
    }
  }

  for (const day of schedule.daysOfWeek) {
    const existingForDay = currentSchedules.find((s) => s.dayOfWeek === day);
    if (!existingForDay) {
      await prisma.recurringSchedule.create({
        data: {
          companyId,
          serviceId,
          dayOfWeek: day,
          estimatedDurationMinutes,
          effectiveFrom: startOfUtcDay(new Date()),
        },
      });
    } else {
      await prisma.recurringSchedule.update({
        where: { id: existingForDay.id },
        data: { active: true, estimatedDurationMinutes },
      });
    }
  }
}

export async function updateService(
  customerId: string,
  serviceId: string,
  input: ServiceInput,
  schedule?: ServiceScheduleInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, customerId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Servizio non trovato." };

  let parsedSchedule: ServiceScheduleInput | undefined;
  if (schedule) {
    const result = serviceScheduleSchema.safeParse(schedule);
    if (!result.success) {
      return { success: false, error: result.error.issues[0]?.message ?? "Dati non validi." };
    }
    parsedSchedule = result.data;
  }

  await prisma.service.update({ where: { id: serviceId }, data: parsed.data });

  if (parsedSchedule) {
    await syncServiceSchedule(
      admin.companyId,
      serviceId,
      parsedSchedule,
      parsed.data.estimatedDurationMinutes
    );
    // Same reason as in createService: a day just added or reactivated
    // here needs its dated occurrences populated now, not at the next
    // cron run.
    await generateAssignmentsForWindow(admin.companyId);
  }

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true, data: undefined };
}

// Deletes the service and everything that depends on it — recurring
// schedules, every dated assignment (past and future), and any pending
// replacement request on those assignments. This is a deliberate, explicit
// action the admin confirms; "Disattiva" remains the way to stop new
// assignments from being generated without losing history.
export async function deleteService(customerId: string, serviceId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, customerId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Servizio non trovato." };

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { serviceId } }),
    prisma.recurringSchedule.deleteMany({ where: { serviceId } }),
    prisma.service.delete({ where: { id: serviceId } }),
  ]);

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/planning");
  revalidatePath("/app/[token]", "layout");
  return { success: true, data: undefined };
}

export async function toggleServiceActive(
  customerId: string,
  serviceId: string
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, customerId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Servizio non trovato." };

  await prisma.service.update({
    where: { id: serviceId },
    data: { active: !existing.active },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true, data: undefined };
}
