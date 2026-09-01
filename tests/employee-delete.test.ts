import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { deleteEmployee } from "@/app/admin/employees/actions";
import {
  createTestAssignment,
  createTestCompany,
  createTestEmployee,
  createTestServiceChain,
} from "./helpers";

function mockAdminSession(companyId: string) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "test-admin", email: "admin@test.local", role: "ADMIN", companyId },
  } as never);
}

describe("deleteEmployee", () => {
  it("removes the employee and their absence requests", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "VACATION",
        startDate: new Date("2031-07-01"),
        endDate: new Date("2031-07-05"),
      },
    });

    const result = await deleteEmployee(employee.id);
    expect(result.success).toBe(true);

    expect(await prisma.employee.findUnique({ where: { id: employee.id } })).toBeNull();
    expect(
      await prisma.absenceRequest.count({ where: { employeeId: employee.id } })
    ).toBe(0);
  });

  it("releases the employee's dated assignments back to UNASSIGNED instead of deleting them", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
      employeeId: employee.id,
    });

    const result = await deleteEmployee(employee.id);
    expect(result.success).toBe(true);

    const after = await prisma.assignment.findUnique({ where: { id: assignment.id } });
    expect(after).not.toBeNull();
    expect(after?.employeeId).toBeNull();
    expect(after?.status).toBe("UNASSIGNED");
  });

  it("refuses to delete an employee from another company", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    mockAdminSession(companyA.id);
    const employee = await createTestEmployee(companyB.id);

    const result = await deleteEmployee(employee.id);
    expect(result.success).toBe(false);

    expect(await prisma.employee.findUnique({ where: { id: employee.id } })).not.toBeNull();
  });
});
