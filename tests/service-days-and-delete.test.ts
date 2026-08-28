import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  createService,
  updateService,
  deleteService,
} from "@/app/admin/customers/[customerId]/actions";
import { startOfUtcDay } from "@/lib/dates";
import {
  createTestAssignment,
  createTestCompany,
  createTestServiceChain,
} from "./helpers";

function mockAdminSession(companyId: string) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "test-admin", email: "admin@test.local", role: "ADMIN", companyId },
  } as never);
}

// Bug report: a day added to a service (at creation or via edit) got its
// RecurringSchedule row, but no dated Assignment showed up on Pianificazione
// until the next cron run or a manual "Genera attività" — indistinguishable
// from the day simply not being assignable at all. Both paths must generate
// inline now.
describe("day changes generate dated occurrences immediately, not on the next cron run", () => {
  it("createService populates today's occurrence right away when today matches a selected day", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);
    const today = startOfUtcDay(new Date());

    await createService(
      customer.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 60 },
      { daysOfWeek: [today.getUTCDay()] }
    );
    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia scale" },
    });

    const occurrence = await prisma.assignment.findFirst({
      where: { serviceId: service.id, date: today },
    });
    expect(occurrence).not.toBeNull();
    expect(occurrence?.status).toBe("UNASSIGNED");
  });

  it("updateService populates the newly-added day's occurrence right away", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);
    const today = startOfUtcDay(new Date());
    // Pick a day different from today so it's genuinely new when added below.
    const otherDay = (today.getUTCDay() + 1) % 7;

    await createService(
      customer.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 60 },
      { daysOfWeek: [otherDay] }
    );
    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia scale" },
    });
    // Nothing generated for today yet — today isn't one of its days.
    const before = await prisma.assignment.findFirst({
      where: { serviceId: service.id, date: today },
    });
    expect(before).toBeNull();

    await updateService(
      customer.id,
      service.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 60 },
      { daysOfWeek: [otherDay, today.getUTCDay()] }
    );

    const after = await prisma.assignment.findFirst({
      where: { serviceId: service.id, date: today },
    });
    expect(after).not.toBeNull();
  });
});

describe("updateService syncs the service's weekly days", () => {
  it("deactivates a day that's unchecked, and updates the shared duration on days left checked", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    await createService(
      customer.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 90 },
      { daysOfWeek: [1, 3, 5] }
    );
    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia scale" },
    });

    // Uncheck Friday (5), keep Monday (1) and Wednesday (3), change the
    // duration — there's no separate ricorrenze page anymore, so this is
    // the only way to fix a wrong duration after creation.
    const result = await updateService(
      customer.id,
      service.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 45 },
      { daysOfWeek: [1, 3] }
    );
    expect(result.success).toBe(true);

    const after = await prisma.recurringSchedule.findMany({
      where: { serviceId: service.id },
      orderBy: { dayOfWeek: "asc" },
    });
    const friday = after.find((s) => s.dayOfWeek === 5)!;
    expect(friday.active).toBe(false);

    const monday = after.find((s) => s.dayOfWeek === 1)!;
    expect(monday.active).toBe(true);
    expect(monday.estimatedDurationMinutes).toBe(45);

    const wednesday = after.find((s) => s.dayOfWeek === 3)!;
    expect(wednesday.active).toBe(true);
    expect(wednesday.estimatedDurationMinutes).toBe(45);
  });

  it("reactivates a previously-unchecked day instead of creating a duplicate schedule", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    await createService(
      customer.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 90 },
      { daysOfWeek: [1] }
    );
    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia scale" },
    });

    // Uncheck Monday.
    await updateService(
      customer.id,
      service.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 90 },
      { daysOfWeek: [] }
    );
    // Re-check it.
    await updateService(
      customer.id,
      service.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 90 },
      { daysOfWeek: [1] }
    );

    const schedules = await prisma.recurringSchedule.findMany({ where: { serviceId: service.id } });
    expect(schedules).toHaveLength(1);
    expect(schedules[0].active).toBe(true);
  });

  it("creates a schedule for a newly-checked day using the service's current duration", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    await createService(
      customer.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 90 },
      { daysOfWeek: [1] }
    );
    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia scale" },
    });

    await updateService(
      customer.id,
      service.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 120 },
      { daysOfWeek: [1, 5] }
    );

    const schedules = await prisma.recurringSchedule.findMany({
      where: { serviceId: service.id },
      orderBy: { dayOfWeek: "asc" },
    });
    expect(schedules).toHaveLength(2);
    const friday = schedules.find((s) => s.dayOfWeek === 5)!;
    expect(friday.estimatedDurationMinutes).toBe(120);
  });
});

describe("deleteService", () => {
  it("deletes a service and its schedules when it has no activity history", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    // No days selected — createService now generates dated occurrences
    // inline for any day it's given, so a service with an actual schedule
    // would already have history the instant it's created.
    await createService(
      customer.id,
      { name: "Pulizia vetri", estimatedDurationMinutes: 30 },
      { daysOfWeek: [] }
    );
    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia vetri" },
    });

    const result = await deleteService(customer.id, service.id);
    expect(result.success).toBe(true);

    const stillThere = await prisma.service.findUnique({ where: { id: service.id } });
    expect(stillThere).toBeNull();
    const scheduleCount = await prisma.recurringSchedule.count({ where: { serviceId: service.id } });
    expect(scheduleCount).toBe(0);
  });

  it("deletes a service with scheduled activities too, cascading to its assignments", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer, service } = await createTestServiceChain(company.id);
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
    });

    const result = await deleteService(customer.id, service.id);
    expect(result.success).toBe(true);

    const stillThere = await prisma.service.findUnique({ where: { id: service.id } });
    expect(stillThere).toBeNull();
    const assignmentCount = await prisma.assignment.count({ where: { serviceId: service.id } });
    expect(assignmentCount).toBe(0);
  });
});
