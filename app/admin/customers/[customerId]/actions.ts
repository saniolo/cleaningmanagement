"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { locationSchema, type LocationInput } from "@/lib/validation/location";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

async function assertCustomerInCompany(customerId: string, companyId: string) {
  return prisma.customer.findFirst({ where: { id: customerId, companyId } });
}

export async function createLocation(
  customerId: string,
  input: LocationInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const customer = await assertCustomerInCompany(customerId, admin.companyId);
  if (!customer) return { success: false, error: "Cliente non trovato." };

  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.location.create({
    data: { ...parsed.data, customerId, companyId: admin.companyId },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true, data: undefined };
}

export async function updateLocation(
  customerId: string,
  locationId: string,
  input: LocationInput
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.location.findFirst({
    where: { id: locationId, customerId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Location non trovata." };

  await prisma.location.update({ where: { id: locationId }, data: parsed.data });

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true, data: undefined };
}

export async function toggleLocationActive(
  customerId: string,
  locationId: string
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.location.findFirst({
    where: { id: locationId, customerId, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Location non trovata." };

  await prisma.location.update({
    where: { id: locationId },
    data: { active: !existing.active },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true, data: undefined };
}
