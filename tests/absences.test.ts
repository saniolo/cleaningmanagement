import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { dateStringToDateValue } from "@/lib/dates";
import { approveAbsenceRequest, rejectAbsenceRequest } from "@/app/admin/absences/actions";
import { createAbsenceRequest } from "@/app/app/[token]/absences/actions";
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

// PROJECT_SPEC.md section 32: "Approving an absence correctly identifies
// impacted assignments." Section 17: never delete the assignment, only free
// the employee allocation; must be transactionally safe.
describe("approveAbsenceRequest", () => {
  it("frees an ASSIGNED assignment inside the range, leaves one outside untouched", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    const inRange = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-04",
      employeeId: employee.id,
    });
    const outOfRange = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-10",
      employeeId: employee.id,
    });

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "VACATION",
        startDate: dateStringToDateValue("2031-04-03"),
        endDate: dateStringToDateValue("2031-04-05"),
        status: "PENDING",
      },
    });

    const result = await approveAbsenceRequest(absence.id);
    expect(result.success).toBe(true);

    const refreshedIn = await prisma.assignment.findUniqueOrThrow({ where: { id: inRange.id } });
    expect(refreshedIn.status).toBe("UNASSIGNED");
    expect(refreshedIn.employeeId).toBeNull();

    const refreshedOut = await prisma.assignment.findUniqueOrThrow({
      where: { id: outOfRange.id },
    });
    expect(refreshedOut.status).toBe("ASSIGNED");
    expect(refreshedOut.employeeId).toBe(employee.id);

    const refreshedAbsence = await prisma.absenceRequest.findUniqueOrThrow({
      where: { id: absence.id },
    });
    expect(refreshedAbsence.status).toBe("APPROVED");
    expect(refreshedAbsence.reviewedAt).not.toBeNull();
  });

  it("never deletes the assignment — the service obligation still exists", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-04",
      employeeId: employee.id,
    });

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "SICKNESS",
        startDate: dateStringToDateValue("2031-04-04"),
        endDate: dateStringToDateValue("2031-04-04"),
        status: "PENDING",
      },
    });

    await approveAbsenceRequest(absence.id);

    const stillExists = await prisma.assignment.findUnique({ where: { id: assignment.id } });
    expect(stillExists).not.toBeNull();
  });

  it("cannot approve the same request twice", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "PERMISSION",
        startDate: dateStringToDateValue("2031-04-04"),
        endDate: dateStringToDateValue("2031-04-04"),
        status: "PENDING",
      },
    });

    const first = await approveAbsenceRequest(absence.id);
    expect(first.success).toBe(true);

    const second = await approveAbsenceRequest(absence.id);
    expect(second.success).toBe(false);
  });

  it("an admin cannot approve another company's absence request", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    mockAdminSession(companyA.id);
    const employeeB = await createTestEmployee(companyB.id);

    const absenceB = await prisma.absenceRequest.create({
      data: {
        companyId: companyB.id,
        employeeId: employeeB.id,
        type: "VACATION",
        startDate: dateStringToDateValue("2031-04-04"),
        endDate: dateStringToDateValue("2031-04-04"),
        status: "PENDING",
      },
    });

    const result = await approveAbsenceRequest(absenceB.id);
    expect(result.success).toBe(false);

    const stillPending = await prisma.absenceRequest.findUniqueOrThrow({
      where: { id: absenceB.id },
    });
    expect(stillPending.status).toBe("PENDING");
  });
});

describe("createAbsenceRequest", () => {
  it("rejects an end date before the start date", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);

    const result = await createAbsenceRequest(employee.accessToken, {
      type: "VACATION",
      startDate: "2031-04-10",
      endDate: "2031-04-05",
    });
    expect(result.success).toBe(false);

    const requests = await prisma.absenceRequest.findMany({ where: { employeeId: employee.id } });
    expect(requests).toHaveLength(0);
  });

  it("accepts a same-day request and one spanning multiple days", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);

    const sameDay = await createAbsenceRequest(employee.accessToken, {
      type: "PERMISSION",
      startDate: "2031-04-10",
      endDate: "2031-04-10",
    });
    expect(sameDay.success).toBe(true);

    const multiDay = await createAbsenceRequest(employee.accessToken, {
      type: "VACATION",
      startDate: "2031-05-01",
      endDate: "2031-05-05",
    });
    expect(multiDay.success).toBe(true);

    const requests = await prisma.absenceRequest.findMany({ where: { employeeId: employee.id } });
    expect(requests).toHaveLength(2);
  });
});

describe("rejectAbsenceRequest", () => {
  it("marks the request REJECTED without touching any assignment", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-04",
      employeeId: employee.id,
    });

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "VACATION",
        startDate: dateStringToDateValue("2031-04-04"),
        endDate: dateStringToDateValue("2031-04-04"),
        status: "PENDING",
      },
    });

    const result = await rejectAbsenceRequest(absence.id);
    expect(result.success).toBe(true);

    const refreshed = await prisma.absenceRequest.findUniqueOrThrow({ where: { id: absence.id } });
    expect(refreshed.status).toBe("REJECTED");

    const refreshedAssignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(refreshedAssignment.status).toBe("ASSIGNED");
    expect(refreshedAssignment.employeeId).toBe(employee.id);
  });
});
