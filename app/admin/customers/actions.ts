"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

export async function createCustomer(input: CustomerInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.customer.create({
    data: { ...parsed.data, companyId: admin.companyId },
  });

  revalidatePath("/admin/customers");
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
