"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { generateEmployeeAccessToken } from "@/lib/auth/employee-token";
import { employeeSchema, type EmployeeInput } from "@/lib/validation/employee";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

export async function createEmployee(input: EmployeeInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.employee.create({
    data: {
      ...parsed.data,
      companyId: admin.companyId,
      accessToken: generateEmployeeAccessToken(),
    },
  });

  revalidatePath("/admin/employees");
  return { success: true, data: undefined };
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.employee.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Dipendente non trovato." };

  await prisma.employee.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/employees");
  return { success: true, data: undefined };
}

export async function toggleEmployeeActive(id: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.employee.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Dipendente non trovato." };

  await prisma.employee.update({
    where: { id },
    data: { active: !existing.active },
  });

  revalidatePath("/admin/employees");
  return { success: true, data: undefined };
}

export async function regenerateEmployeeAccessToken(
  id: string
): Promise<ActionResult<{ accessToken: string }>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const existing = await prisma.employee.findFirst({
    where: { id, companyId: admin.companyId },
  });
  if (!existing) return { success: false, error: "Dipendente non trovato." };

  const accessToken = generateEmployeeAccessToken();
  await prisma.employee.update({ where: { id }, data: { accessToken } });

  revalidatePath("/admin/employees");
  return { success: true, data: { accessToken } };
}
