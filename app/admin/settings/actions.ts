"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/session";
import { generateAssignmentsForWindow } from "@/lib/scheduling/generate";
import type { ActionResult } from "@/types/actions";

export async function generateAssignmentsAction(): Promise<ActionResult<{ created: number }>> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Non hai i permessi necessari per eseguire questa operazione.",
    };
  }

  const result = await generateAssignmentsForWindow(admin.companyId);

  revalidatePath("/admin/settings");
  return { success: true, data: result };
}
