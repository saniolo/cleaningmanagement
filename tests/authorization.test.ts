import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { resolveEmployeeByToken } from "@/lib/permissions/employee";
import { generateEmployeeAccessToken } from "@/lib/auth/employee-token";
import { dateStringToDateValue } from "@/lib/dates";
import { approveAbsenceRequest } from "@/app/admin/absences/actions";
import { createAssignment } from "@/app/admin/planning/actions";
import { createTestCompany, createTestEmployee, createTestServiceChain } from "./helpers";

function mockAdminSession(companyId: string) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "test-admin", email: "admin@test.local", role: "ADMIN", companyId },
  } as never);
}

// PROJECT_SPEC.md section 32: "Employee cannot access another employee's
// information." The token IS the identity — this is the one function in the
// app allowed to resolve it, so its correctness is the whole ballgame.
describe("resolveEmployeeByToken", () => {
  it("returns null for an unknown token", async () => {
    const result = await resolveEmployeeByToken("this-token-does-not-exist");
    expect(result).toBeNull();
  });

  it("returns null for a deactivated employee's token", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    await prisma.employee.update({ where: { id: employee.id }, data: { active: false } });

    const result = await resolveEmployeeByToken(employee.accessToken);
    expect(result).toBeNull();
  });

  it("each token resolves only to its own employee, never another's", async () => {
    const company = await createTestCompany();
    const employeeA = await createTestEmployee(company.id, "A");
    const employeeB = await createTestEmployee(company.id, "B");

    const resolvedA = await resolveEmployeeByToken(employeeA.accessToken);
    const resolvedB = await resolveEmployeeByToken(employeeB.accessToken);

    expect(resolvedA?.id).toBe(employeeA.id);
    expect(resolvedB?.id).toBe(employeeB.id);
    expect(resolvedA?.id).not.toBe(resolvedB?.id);
  });

  it("a stale/regenerated token no longer resolves", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const oldToken = employee.accessToken;

    await prisma.employee.update({
      where: { id: employee.id },
      data: { accessToken: generateEmployeeAccessToken() },
    });

    const result = await resolveEmployeeByToken(oldToken);
    expect(result).toBeNull();
  });
});

// PROJECT_SPEC.md: "companyId scoping on business queries... never trust IDs
// received from the client without checking access rights." This is the
// multi-tenant analogue of the employee-isolation tests above — an admin's
// session must never let them reach across into another company's data.
describe("company scoping on admin mutations", () => {
  it("createAssignment rejects a serviceId belonging to another company", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    mockAdminSession(companyA.id);
    const { service: serviceB } = await createTestServiceChain(companyB.id);

    const result = await createAssignment({
      serviceId: serviceB.id,
      date: "2031-06-01",
      startTime: "08:00",
      endTime: "10:00",
    });

    expect(result.success).toBe(false);

    const leaked = await prisma.assignment.findFirst({ where: { serviceId: serviceB.id } });
    expect(leaked).toBeNull();
  });

  it("approveAbsenceRequest cannot reach an absence request in another company", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    mockAdminSession(companyA.id);
    const employeeB = await createTestEmployee(companyB.id);

    const absenceB = await prisma.absenceRequest.create({
      data: {
        companyId: companyB.id,
        employeeId: employeeB.id,
        type: "VACATION",
        startDate: dateStringToDateValue("2031-06-01"),
        endDate: dateStringToDateValue("2031-06-01"),
        status: "PENDING",
      },
    });

    const result = await approveAbsenceRequest(absenceB.id);
    expect(result.success).toBe(false);

    const untouched = await prisma.absenceRequest.findUniqueOrThrow({
      where: { id: absenceB.id },
    });
    expect(untouched.status).toBe("PENDING");
  });
});
