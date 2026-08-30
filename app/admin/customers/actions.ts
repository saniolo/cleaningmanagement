"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  customerSchema,
  newCustomerSchema,
  type CustomerInput,
  type NewCustomerInput,
} from "@/lib/validation/customer";
import { startOfUtcDay } from "@/lib/dates";
import { generateAssignmentsForWindow } from "@/lib/scheduling/generate";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

// "Nuovo cliente" — the customer and any services picked from the
// activity-template catalog are created together, atomically: a
// half-created customer with no services would be worse than the form just
// failing outright. Each picked activity can also get its own weekly
// cadence right here (same as ServiceForm's day toggles), so "Pulizia
// scale ogni lunedì e mercoledì" is set up in the same step instead of
// creating the customer, opening the service, and adding days by hand.
export async function createCustomer(input: NewCustomerInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = newCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const { activities, ...customerFields } = parsed.data;
  const templates = await prisma.activityTemplate.findMany({
    where: { id: { in: activities.map((a) => a.activityTemplateId) }, companyId: admin.companyId },
  });
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const today = startOfUtcDay(new Date());

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: { ...customerFields, companyId: admin.companyId },
    });

    for (const activity of activities) {
      // Ignore ids that don't resolve to this company's catalog (stale
      // selection, or a foreign id slipped through) rather than failing the
      // whole customer creation over one bad entry.
      const template = templateById.get(activity.activityTemplateId);
      if (!template) continue;

      const service = await tx.service.create({
        data: {
          companyId: admin.companyId,
          customerId: customer.id,
          name: template.name,
          estimatedDurationMinutes: template.estimatedDurationMinutes,
        },
      });

      if (activity.daysOfWeek.length > 0) {
        await tx.recurringSchedule.createMany({
          data: activity.daysOfWeek.map((dayOfWeek) => ({
            companyId: admin.companyId,
            serviceId: service.id,
            dayOfWeek,
            estimatedDurationMinutes: template.estimatedDurationMinutes,
            effectiveFrom: today,
          })),
        });
      }
    }
  });

  // Same reason as createService/updateService: a day scheduled here needs
  // its dated occurrences populated now, not at the next cron run.
  if (activities.some((a) => a.daysOfWeek.length > 0)) {
    await generateAssignmentsForWindow(admin.companyId);
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/planning");
  revalidatePath("/admin/unassigned");
  return { success: true, data: undefined };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.customer.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Cliente non trovato." };

  await prisma.customer.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { success: true, data: undefined };
}

// Deletes the customer and every service under it, cascading down through
// each service's recurring schedules, dated assignments, and any pending
// replacement requests on those assignments — same cascading delete as
// deleteService in [customerId]/actions.ts, just rolled up to every service
// at once. "Disattiva" remains the way to hide a customer from new
// scheduling without losing its history.
export async function deleteCustomer(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.customer.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Cliente non trovato." };

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { service: { customerId: id } } }),
    prisma.recurringSchedule.deleteMany({ where: { service: { customerId: id } } }),
    prisma.service.deleteMany({ where: { customerId: id } }),
    prisma.customer.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/customers");
  revalidatePath("/admin/planning");
  revalidatePath("/admin/unassigned");
  revalidatePath("/app/[token]", "layout");
  return { success: true, data: undefined };
}

export async function toggleCustomerActive(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.customer.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Cliente non trovato." };

  await prisma.customer.update({
    where: { id },
    data: { active: !existing.active },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { success: true, data: undefined };
}
