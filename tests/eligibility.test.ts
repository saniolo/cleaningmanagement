import { describe, it, expect } from "vitest";

import { prisma } from "@/lib/db";
import { getEligibleEmployees } from "@/lib/scheduling/eligibility";
import { dateStringToDateValue } from "@/lib/dates";
import {
  createTestAssignment,
  createTestCompany,
  createTestEmployee,
  createTestServiceChain,
} from "./helpers";

// Scheduling no longer tracks a specific time of day, so there's no
// overlap check left to test (see the deleted hasSchedulingConflict) —
// eligibility is now just active + not-absent, plus a same-day workload
// figure the caller can show instead of a hard block.
describe("getEligibleEmployees", () => {
  it("includes an active, non-absent employee with zero workload by default", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);

    const eligible = await getEligibleEmployees(company.id, dateStringToDateValue("2031-04-01"));

    const found = eligible.find((e) => e.id === employee.id);
    expect(found).toBeDefined();
    expect(found?.assignedCount).toBe(0);
    expect(found?.assignedMinutes).toBe(0);
  });

  it("excludes an inactive employee", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    await prisma.employee.update({ where: { id: employee.id }, data: { active: false } });

    const eligible = await getEligibleEmployees(company.id, dateStringToDateValue("2031-04-01"));

    expect(eligible.find((e) => e.id === employee.id)).toBeUndefined();
  });

  it("excludes an employee with an APPROVED absence covering the date", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    await prisma.absenceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "VACATION",
        startDate: dateStringToDateValue("2031-04-01"),
        endDate: dateStringToDateValue("2031-04-03"),
        status: "APPROVED",
      },
    });

    const eligible = await getEligibleEmployees(company.id, dateStringToDateValue("2031-04-02"));

    expect(eligible.find((e) => e.id === employee.id)).toBeUndefined();
  });

  it("reports the employee's existing same-day ASSIGNED workload", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-05",
      durationMinutes: 45,
      employeeId: employee.id,
    });
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-05",
      durationMinutes: 30,
      employeeId: employee.id,
    });
    // An UNASSIGNED assignment on the same day shouldn't count toward
    // workload — nobody is doing it yet.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-04-05",
      durationMinutes: 100,
    });

    const eligible = await getEligibleEmployees(company.id, dateStringToDateValue("2031-04-05"));

    const found = eligible.find((e) => e.id === employee.id);
    expect(found?.assignedCount).toBe(2);
    expect(found?.assignedMinutes).toBe(75);
  });
});
