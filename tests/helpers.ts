import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { generateEmployeeAccessToken } from "@/lib/auth/employee-token";
import { dateStringToDateValue } from "@/lib/dates";

// Every test creates its own Company and only touches data scoped to it, so
// test files can run in any order (or in parallel) against the same test
// database without interfering with each other — no shared fixtures, no
// truncate-between-tests step needed.
let counter = 0;
function unique(label: string): string {
  counter += 1;
  return `${label}-${Date.now()}-${counter}`;
}

export async function createTestCompany() {
  return prisma.company.create({ data: { name: unique("Test Company") } });
}

export async function createTestAdminUser(companyId: string) {
  const password = await bcrypt.hash("password123", 4);
  return prisma.user.create({
    data: {
      companyId,
      email: `${unique("admin")}@test.local`,
      password,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });
}

export async function createTestEmployee(
  companyId: string,
  firstName = "Test",
  lastName = unique("Employee")
) {
  return prisma.employee.create({
    data: { companyId, firstName, lastName, accessToken: generateEmployeeAccessToken() },
  });
}

export async function createTestServiceChain(companyId: string) {
  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: unique("Test Customer"),
      addressLine: "Via Test 1",
      city: "Roma",
      postalCode: "00100",
      province: "RM",
    },
  });
  const service = await prisma.service.create({
    data: {
      companyId,
      customerId: customer.id,
      name: unique("Test Service"),
      estimatedDurationMinutes: 60,
    },
  });
  return { customer, service };
}

export async function createTestAssignment(params: {
  companyId: string;
  serviceId: string;
  date: string;
  durationMinutes?: number;
  employeeId?: string;
  sourceRecurringScheduleId?: string;
}) {
  return prisma.assignment.create({
    data: {
      companyId: params.companyId,
      serviceId: params.serviceId,
      date: dateStringToDateValue(params.date),
      durationMinutes: params.durationMinutes ?? 60,
      employeeId: params.employeeId ?? null,
      status: params.employeeId ? "ASSIGNED" : "UNASSIGNED",
      sourceRecurringScheduleId: params.sourceRecurringScheduleId ?? null,
    },
  });
}
