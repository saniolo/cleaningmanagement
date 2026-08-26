import { prisma } from "@/lib/db";

// Resolves the employee identity for a /app/[token] request. This is the
// ONLY place employee identity is derived — pages/actions under /app/[token]
// must call this (never trust an employeeId from the client) and 404 on a
// miss, per PROJECT_SPEC.md's "never trust IDs received from the client".
export async function resolveEmployeeByToken(token: string) {
  return prisma.employee.findFirst({
    where: { accessToken: token, active: true },
  });
}
