import { cache } from "react";

import { prisma } from "@/lib/db";

// Resolves the employee identity for a /app/[token] request. This is the
// ONLY place employee identity is derived — pages/actions under /app/[token]
// must call this (never trust an employeeId from the client) and 404 on a
// miss, per PROJECT_SPEC.md's "never trust IDs received from the client".
//
// Wrapped in React's cache() so the layout and page (both call this for the
// same token on every request) hit the database once, not twice.
export const resolveEmployeeByToken = cache(async (token: string) => {
  return prisma.employee.findFirst({
    where: { accessToken: token, active: true },
  });
});
