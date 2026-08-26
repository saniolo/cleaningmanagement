"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { serviceSchema, type ServiceInput } from "@/lib/validation/service";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

async function assertLocationInCompany(customerId: string, locationId: string, companyId: string) {
  return prisma.location.findFirst({
    where: { id: locationId, customerId, companyId },
  });
}

export async function createService(
  customerId: string,
  locationId: string,
  input: ServiceInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const location = await assertLocationInCompany(customerId, locationId, admin.companyId);
  if (!location) return { success: false, error: "Location non trovata." };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.service.create({
    data: { ...parsed.data, locationId, companyId: admin.companyId },
  });

  revalidatePath(`/admin/customers/${customerId}/locations/${locationId}`);
  return { success: true, data: undefined };
}

export async function updateService(
  customerId: string,
  locationId: string,
  serviceId: string,
  input: ServiceInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, locationId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Servizio non trovato." };

  await prisma.service.update({ where: { id: serviceId }, data: parsed.data });

  revalidatePath(`/admin/customers/${customerId}/locations/${locationId}`);
  return { success: true, data: undefined };
}

export async function toggleServiceActive(
  customerId: string,
  locationId: string,
  serviceId: string
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, locationId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Servizio non trovato." };

  await prisma.service.update({
    where: { id: serviceId },
    data: { active: !existing.active },
  });

  revalidatePath(`/admin/customers/${customerId}/locations/${locationId}`);
  return { success: true, data: undefined };
}
