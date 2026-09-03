import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { dateStringToDateValue } from "@/lib/dates";
import { getMonthlyHours } from "@/lib/reports/monthly-hours";
import { approveAbsenceRequest } from "@/app/admin/absences/actions";
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

async function rowFor(companyId: string, month: string, employeeId: string) {
  const { rows } = await getMonthlyHours(companyId, month);
  return rows.find((r) => r.employeeId === employeeId);
}

describe("getMonthlyHours", () => {
  it("splits ordinary, accepted overtime and pending overtime for a worked month", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    // Ordinary: assigned, no confirmation required.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-05-04",
      durationMinutes: 120,
      employeeId: employee.id,
    });
    // Overtime accepted: requires confirmation, confirmedAt set.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-05-06",
      durationMinutes: 90,
      employeeId: employee.id,
      requiresConfirmation: true,
      confirmedAt: new Date("2026-05-05T10:00:00Z"),
    });
    // Overtime still pending: requires confirmation, not yet accepted.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-05-08",
      durationMinutes: 30,
      employeeId: employee.id,
      requiresConfirmation: true,
    });

    const row = await rowFor(company.id, "2026-05", employee.id);
    expect(row).toBeDefined();
    expect(row!.ordinaryMinutes).toBe(120);
    expect(row!.overtimeMinutes).toBe(90);
    expect(row!.pendingOvertimeMinutes).toBe(30);
    // Total excludes pending overtime.
    expect(row!.totalMinutes).toBe(210);
  });

  it("attributes hours freed by an approved absence to the matching type", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-05-12",
      durationMinutes: 180,
      employeeId: employee.id,
    });
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-05-13",
      durationMinutes: 120,
      employeeId: employee.id,
    });

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "SICKNESS",
        startDate: dateStringToDateValue("2026-05-12"),
        endDate: dateStringToDateValue("2026-05-13"),
        status: "PENDING",
      },
    });

    await approveAbsenceRequest(absence.id);

    const row = await rowFor(company.id, "2026-05", employee.id);
    expect(row!.sicknessMinutes).toBe(300);
    expect(row!.vacationMinutes).toBe(0);
    expect(row!.absenceMinutes).toBe(300); // Ferie + Permessi + Malattia
    expect(row!.ordinaryMinutes).toBe(0); // the assignments were freed
    expect(row!.totalMinutes).toBe(300);
  });

  it("sums Ferie, Permessi and Malattia into absenceMinutes", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    const cases: [string, "VACATION" | "PERMISSION" | "SICKNESS", number][] = [
      ["2026-05-04", "VACATION", 60],
      ["2026-05-06", "PERMISSION", 90],
      ["2026-05-08", "SICKNESS", 120],
    ];
    for (const [date, type, durationMinutes] of cases) {
      await createTestAssignment({
        companyId: company.id,
        serviceId: service.id,
        date,
        durationMinutes,
        employeeId: employee.id,
      });
      const absence = await prisma.absenceRequest.create({
        data: {
          companyId: company.id,
          employeeId: employee.id,
          type,
          startDate: dateStringToDateValue(date),
          endDate: dateStringToDateValue(date),
          status: "PENDING",
        },
      });
      await approveAbsenceRequest(absence.id);
    }

    const row = await rowFor(company.id, "2026-05", employee.id);
    expect(row!.vacationMinutes).toBe(60);
    expect(row!.permissionMinutes).toBe(90);
    expect(row!.sicknessMinutes).toBe(120);
    expect(row!.absenceMinutes).toBe(270);
    expect(row!.totalMinutes).toBe(270);
  });

  it("keeps freed-absence hours in the month the day falls in, not where the absence starts", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    // Absence spans the April/May boundary; one scheduled day each side.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-04-30",
      durationMinutes: 60,
      employeeId: employee.id,
    });
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-05-01",
      durationMinutes: 240,
      employeeId: employee.id,
    });

    const absence = await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "VACATION",
        startDate: dateStringToDateValue("2026-04-29"),
        endDate: dateStringToDateValue("2026-05-02"),
        status: "PENDING",
      },
    });
    await approveAbsenceRequest(absence.id);

    const april = await rowFor(company.id, "2026-04", employee.id);
    const may = await rowFor(company.id, "2026-05", employee.id);
    expect(april!.vacationMinutes).toBe(60);
    expect(may!.vacationMinutes).toBe(240);
  });

  it("ignores assignments and employees from other companies", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    const employeeA = await createTestEmployee(companyA.id);
    const employeeB = await createTestEmployee(companyB.id);
    const { service: serviceB } = await createTestServiceChain(companyB.id);

    await createTestAssignment({
      companyId: companyB.id,
      serviceId: serviceB.id,
      date: "2026-05-04",
      durationMinutes: 120,
      employeeId: employeeB.id,
    });

    const { rows } = await getMonthlyHours(companyA.id, "2026-05");
    expect(rows.some((r) => r.employeeId === employeeB.id)).toBe(false);
    expect(rows.find((r) => r.employeeId === employeeA.id)?.totalMinutes ?? 0).toBe(0);
  });

  it("excludes days outside the requested month", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-04-30",
      durationMinutes: 60,
      employeeId: employee.id,
    });
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2026-06-01",
      durationMinutes: 60,
      employeeId: employee.id,
    });

    const row = await rowFor(company.id, "2026-05", employee.id);
    expect(row?.ordinaryMinutes ?? 0).toBe(0);
  });
});
