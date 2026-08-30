"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import { adminProfileSchema, type AdminProfileInput } from "@/lib/validation/admin-profile";
import type { ActionResult } from "@/types/actions";

const PERMISSION_ERROR = "Non hai i permessi necessari per eseguire questa operazione.";

// Self-service edit of the admin's own account (name, email, password).
// currentPassword is re-verified server-side regardless of what the form
// showed — the one thing standing between "I forgot my session was open"
// and someone else editing this account from an unlocked browser.
export async function updateAdminProfile(input: AdminProfileInput): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { success: false, error: PERMISSION_ERROR };

  const parsed = adminProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) return { success: false, error: "Utente non trovato." };

  const currentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!currentPasswordValid) {
    return { success: false, error: "Password attuale non corretta." };
  }

  if (parsed.data.email !== user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return { success: false, error: "Esiste già un utente con questa email." };
    }
  }

  const newPasswordHash = parsed.data.newPassword
    ? await bcrypt.hash(parsed.data.newPassword, 12)
    : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      ...(newPasswordHash ? { password: newPasswordHash } : {}),
    },
  });

  // The session JWT keeps the email it had at login until the next
  // sign-in — the dashboard re-reads the User row fresh rather than
  // trusting the session for display, so this just needs the page data
  // itself to be current.
  revalidatePath("/admin");
  return { success: true, data: undefined };
}
