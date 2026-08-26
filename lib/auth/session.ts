import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

// Reusable server-side session accessor. Middleware already blocks
// unauthenticated/non-admin requests to /admin/**, but per PROJECT_SPEC.md
// ("Server-side security") every mutation must independently re-verify
// authentication/authorization rather than relying solely on middleware or
// the UI — Server Actions added from Milestone 2 onward should call this.
export async function getCurrentAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  return session.user;
}
