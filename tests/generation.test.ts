import { describe, it, expect } from "vitest";

import { prisma } from "@/lib/db";
import { generateAssignmentsForWindow } from "@/lib/scheduling/generate";
import { addDaysToDateValue, startOfUtcDay, timeStringToTimeValue } from "@/lib/dates";
import { createTestCompany, createTestServiceChain } from "./helpers";

// PROJECT_SPEC.md section 32: "Assignment generation is idempotent. No
// duplicate recurring assignments are created."
describe("generateAssignmentsForWindow", () => {
  it("is idempotent: running it twice creates zero new rows the second time", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const today = startOfUtcDay(new Date());

    await prisma.recurringSchedule.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        dayOfWeek: today.getUTCDay(),
        startTime: timeStringToTimeValue("08:00"),
        estimatedDurationMinutes: 60,
        effectiveFrom: today,
      },
    });

    const first = await generateAssignmentsForWindow(company.id, 4);
    expect(first.created).toBeGreaterThan(0);

    const second = await generateAssignmentsForWindow(company.id, 4);
    expect(second.created).toBe(0);

    const totalInDb = await prisma.assignment.count({ where: { companyId: company.id } });
    expect(totalInDb).toBe(first.created);
  });

  it("respects effectiveUntil — nothing generated past the schedule's end date", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const today = startOfUtcDay(new Date());

    // A schedule that already expired yesterday should produce nothing.
    await prisma.recurringSchedule.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        dayOfWeek: today.getUTCDay(),
        startTime: timeStringToTimeValue("08:00"),
        estimatedDurationMinutes: 60,
        effectiveFrom: addDaysToDateValue(today, -30),
        effectiveUntil: addDaysToDateValue(today, -1),
      },
    });

    const result = await generateAssignmentsForWindow(company.id, 4);
    expect(result.created).toBe(0);
  });

  it("respects the active flag — an inactive schedule generates nothing", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const today = startOfUtcDay(new Date());

    await prisma.recurringSchedule.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        dayOfWeek: today.getUTCDay(),
        startTime: timeStringToTimeValue("08:00"),
        estimatedDurationMinutes: 60,
        effectiveFrom: today,
        active: false,
      },
    });

    const result = await generateAssignmentsForWindow(company.id, 4);
    expect(result.created).toBe(0);
  });

  it("does not generate assignments for another company's schedules", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    const { service } = await createTestServiceChain(companyB.id);
    const today = startOfUtcDay(new Date());

    await prisma.recurringSchedule.create({
      data: {
        companyId: companyB.id,
        serviceId: service.id,
        dayOfWeek: today.getUTCDay(),
        startTime: timeStringToTimeValue("08:00"),
        estimatedDurationMinutes: 60,
        effectiveFrom: today,
      },
    });

    const result = await generateAssignmentsForWindow(companyA.id, 4);
    expect(result.created).toBe(0);

    const companyAAssignments = await prisma.assignment.count({
      where: { companyId: companyA.id },
    });
    expect(companyAAssignments).toBe(0);
  });
});
