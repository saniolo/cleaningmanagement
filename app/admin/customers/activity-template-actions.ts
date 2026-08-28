"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { activityTemplateSchema, type ActivityTemplateInput } from "@/lib/validation/activity-template";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

// Adding one here is meant to be quick and permanent: it shows up as a
// pick for every customer set up afterward, not just this one — see
// ActivityTemplate in schema.prisma.
export async function createActivityTemplate(
  input: ActivityTemplateInput
): Promise<ActionResult<{ id: string; name: string; estimatedDurationMinutes: number }>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = activityTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const existing = await prisma.activityTemplate.findFirst({
    where: { companyId: admin.companyId, name: parsed.data.name },
  });
  if (existing) {
    return { success: false, error: "Esiste già un'attività standard con questo nome." };
  }

  const template = await prisma.activityTemplate.create({
    data: { ...parsed.data, companyId: admin.companyId },
  });

  revalidatePath("/admin/customers");
  return {
    success: true,
    data: {
      id: template.id,
      name: template.name,
      estimatedDurationMinutes: template.estimatedDurationMinutes,
    },
  };
}
