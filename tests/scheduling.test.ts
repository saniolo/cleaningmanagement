import { describe, it, expect } from "vitest";

import { hasSchedulingConflict } from "@/lib/scheduling/conflicts";
import { dateStringToDateValue, timeStringToTimeValue } from "@/lib/dates";
import {
  createTestAssignment,
  createTestCompany,
  createTestEmployee,
  createTestServiceChain,
} from "./helpers";

// PROJECT_SPEC.md section 32: "Conflicting assignments are detected."
describe("hasSchedulingConflict", () => {
  it("detects an overlapping ASSIGNED assignment for the same employee/date", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-03-10",
      startTime: "08:00",
      endTime: "10:00",
      employeeId: employee.id,
    });

    const conflict = await hasSchedulingConflict(
      employee.id,
      dateStringToDateValue("2031-03-10"),
      timeStringToTimeValue("09:00"),
      timeStringToTimeValue("11:00")
    );

    expect(conflict).toBe(true);
  });

  it("does not flag adjacent (non-overlapping) assignments", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-03-11",
      startTime: "08:00",
      endTime: "10:00",
      employeeId: employee.id,
    });

    const conflict = await hasSchedulingConflict(
      employee.id,
      dateStringToDateValue("2031-03-11"),
      timeStringToTimeValue("10:00"),
      timeStringToTimeValue("12:00")
    );

    expect(conflict).toBe(false);
  });

  it("ignores UNASSIGNED assignments — no employee means no conflict", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-03-12",
      startTime: "08:00",
      endTime: "10:00",
      // no employeeId -> UNASSIGNED
    });

    const conflict = await hasSchedulingConflict(
      employee.id,
      dateStringToDateValue("2031-03-12"),
      timeStringToTimeValue("08:00"),
      timeStringToTimeValue("10:00")
    );

    expect(conflict).toBe(false);
  });

  it("excludes the given assignment id, for checking an edit against itself", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);
    const { service } = await createTestServiceChain(company.id);

    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-03-13",
      startTime: "08:00",
      endTime: "10:00",
      employeeId: employee.id,
    });

    const conflict = await hasSchedulingConflict(
      employee.id,
      dateStringToDateValue("2031-03-13"),
      timeStringToTimeValue("08:00"),
      timeStringToTimeValue("10:00"),
      assignment.id
    );

    expect(conflict).toBe(false);
  });

  it("does not flag a different employee's overlapping assignment", async () => {
    const company = await createTestCompany();
    const employeeA = await createTestEmployee(company.id, "A");
    const employeeB = await createTestEmployee(company.id, "B");
    const { service } = await createTestServiceChain(company.id);

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-03-14",
      startTime: "08:00",
      endTime: "10:00",
      employeeId: employeeA.id,
    });

    const conflict = await hasSchedulingConflict(
      employeeB.id,
      dateStringToDateValue("2031-03-14"),
      timeStringToTimeValue("08:00"),
      timeStringToTimeValue("10:00")
    );

    expect(conflict).toBe(false);
  });
});
