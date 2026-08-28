import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { cloneWeekToNextWeek } from "@/app/admin/planning/actions";
import { addDaysToDateValue, dateStringToDateValue, dateValueToDateString } from "@/lib/dates";
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

// Replaces all the automatic recurring-schedule/default-employee machinery
// with a plain, explicit, admin-triggered action: copy what's assigned this
// week onto the same weekday/employee next week. No schedule, no ongoing
// link — running it again next week is just clicking the button again.
describe("cloneWeekToNextWeek", () => {
  it("copies every ASSIGNED activity in the week to the same weekday next week", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const giulia = await createTestEmployee(company.id, "Giulia", "Bianchi");

    const monday = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
      employeeId: giulia.id,
    });
    const wednesday = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-04",
      employeeId: giulia.id,
    });
    // Unassigned in the same week must not be cloned — there's no employee
    // to copy it to.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-03",
    });

    const result = await cloneWeekToNextWeek("2031-06-02");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.clonedCount).toBe(2);
    expect(result.data.skippedCount).toBe(0);

    const nextMonday = await prisma.assignment.findFirst({
      where: {
        companyId: company.id,
        date: addDaysToDateValue(monday.date, 7),
        employeeId: giulia.id,
      },
    });
    expect(nextMonday).not.toBeNull();
    expect(nextMonday?.sourceRecurringScheduleId).toBeNull();
    expect(nextMonday?.status).toBe("ASSIGNED");

    const nextWednesday = await prisma.assignment.findFirst({
      where: {
        companyId: company.id,
        date: addDaysToDateValue(wednesday.date, 7),
        employeeId: giulia.id,
      },
    });
    expect(nextWednesday).not.toBeNull();

    const totalNextWeek = await prisma.assignment.count({
      where: { companyId: company.id, date: { gte: addDaysToDateValue(monday.date, 7) } },
    });
    expect(totalNextWeek).toBe(2);
  });

  // There's no more time-of-day to overlap on, so a target date only ever
  // blocks a clone when that exact service+date is already covered by
  // someone — regardless of who. Using a different employee here proves
  // the skip isn't about Giulia's own availability.
  it("skips a clone when the target service+date is already covered by someone else", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const giulia = await createTestEmployee(company.id, "Giulia", "Bianchi");
    const marco = await createTestEmployee(company.id, "Marco", "Verdi");

    const monday = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
      employeeId: giulia.id,
    });

    // Someone else already covers this exact service on next Monday.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: dateValueToDateString(addDaysToDateValue(monday.date, 7)),
      employeeId: marco.id,
    });

    const result = await cloneWeekToNextWeek("2031-06-02");
    expect(result.success).toBe(false);
  });

  it("clones what it can and reports the rest as skipped when only some slots are already covered", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const giulia = await createTestEmployee(company.id, "Giulia", "Bianchi");

    const monday = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
      employeeId: giulia.id,
    });
    const wednesday = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-04",
      employeeId: giulia.id,
    });
    // Blocks only next Monday's clone — already covered.
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: dateValueToDateString(addDaysToDateValue(monday.date, 7)),
      employeeId: giulia.id,
    });

    const result = await cloneWeekToNextWeek("2031-06-02");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.clonedCount).toBe(1);
    expect(result.data.skippedCount).toBe(1);

    const nextWednesday = await prisma.assignment.findFirst({
      where: {
        companyId: company.id,
        date: addDaysToDateValue(wednesday.date, 7),
        employeeId: giulia.id,
      },
    });
    expect(nextWednesday).not.toBeNull();
  });

  // Bug report: a service can have its own active RecurringSchedule
  // (untouched by this feature) that independently keeps generating that
  // service's own UNASSIGNED occurrences ahead of time. Cloning into a slot
  // that schedule already populated must fill that existing row rather than
  // create a second one next to it — otherwise the grid shows the same
  // activity twice, one covered and one still sitting in "da assegnare".
  it("fills an already-existing UNASSIGNED occurrence at the target slot instead of duplicating it", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const giulia = await createTestEmployee(company.id, "Giulia", "Bianchi");

    const monday = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
      employeeId: giulia.id,
    });

    const schedule = await prisma.recurringSchedule.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        dayOfWeek: 1,
        estimatedDurationMinutes: 120,
        effectiveFrom: new Date("2031-06-01"),
      },
    });
    const preGenerated = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: dateValueToDateString(addDaysToDateValue(monday.date, 7)),
      sourceRecurringScheduleId: schedule.id,
    });
    expect(preGenerated.status).toBe("UNASSIGNED");

    const result = await cloneWeekToNextWeek("2031-06-02");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.clonedCount).toBe(1);

    const refreshedPreGenerated = await prisma.assignment.findUniqueOrThrow({
      where: { id: preGenerated.id },
    });
    expect(refreshedPreGenerated.status).toBe("ASSIGNED");
    expect(refreshedPreGenerated.employeeId).toBe(giulia.id);
    // Still linked to its original schedule — filling it in isn't the same
    // as replacing it.
    expect(refreshedPreGenerated.sourceRecurringScheduleId).toBe(schedule.id);

    const totalAtTargetSlot = await prisma.assignment.count({
      where: {
        companyId: company.id,
        serviceId: service.id,
        date: addDaysToDateValue(monday.date, 7),
      },
    });
    expect(totalAtTargetSlot).toBe(1);
  });

  it("does not create a recurring schedule or repeat on its own — cloning again is a separate explicit call", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const giulia = await createTestEmployee(company.id, "Giulia", "Bianchi");

    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
      employeeId: giulia.id,
    });

    await cloneWeekToNextWeek("2031-06-02");

    const scheduleCount = await prisma.recurringSchedule.count({ where: { companyId: company.id } });
    expect(scheduleCount).toBe(0);

    // The week after next stays untouched — no automatic third week.
    const twoWeeksOut = await prisma.assignment.count({
      where: {
        companyId: company.id,
        date: addDaysToDateValue(dateStringToDateValue("2031-06-02"), 14),
      },
    });
    expect(twoWeeksOut).toBe(0);
  });
});
