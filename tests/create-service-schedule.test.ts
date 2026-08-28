import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { createService } from "@/app/admin/customers/[customerId]/actions";
import { startOfUtcDay } from "@/lib/dates";
import { createTestCompany, createTestServiceChain } from "./helpers";

function mockAdminSession(companyId: string) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "test-admin", email: "admin@test.local", role: "ADMIN", companyId },
  } as never);
}

// "Pulizia scale deve essere fatta lunedì, mercoledì e venerdì" — set up
// directly from the service creation form, one RecurringSchedule per
// selected day, instead of creating the service and then adding three
// ricorrenze by hand from its own page.
describe("createService with a weekly schedule", () => {
  it("creates one RecurringSchedule per selected day, all unstaffed", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    const result = await createService(
      customer.id,
      { name: "Pulizia scale", estimatedDurationMinutes: 90 },
      { daysOfWeek: [1, 3, 5] }
    );
    expect(result.success).toBe(true);

    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia scale" },
    });
    const schedules = await prisma.recurringSchedule.findMany({
      where: { serviceId: service.id },
      orderBy: { dayOfWeek: "asc" },
    });

    expect(schedules).toHaveLength(3);
    expect(schedules.map((s) => s.dayOfWeek)).toEqual([1, 3, 5]);
    for (const s of schedules) {
      expect(s.estimatedDurationMinutes).toBe(90);
      expect(s.effectiveFrom.getTime()).toBe(startOfUtcDay(new Date()).getTime());
    }
  });

  it("creates no schedule at all when no day is selected", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    const result = await createService(
      customer.id,
      { name: "Pulizia vetri", estimatedDurationMinutes: 45 },
      { daysOfWeek: [] }
    );
    expect(result.success).toBe(true);

    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia vetri" },
    });
    const scheduleCount = await prisma.recurringSchedule.count({
      where: { serviceId: service.id },
    });
    expect(scheduleCount).toBe(0);
  });

  it("creates no schedule when the schedule argument is omitted entirely", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer } = await createTestServiceChain(company.id);

    const result = await createService(customer.id, {
      name: "Pulizia finestre",
      estimatedDurationMinutes: 30,
    });
    expect(result.success).toBe(true);

    const service = await prisma.service.findFirstOrThrow({
      where: { customerId: customer.id, name: "Pulizia finestre" },
    });
    const scheduleCount = await prisma.recurringSchedule.count({
      where: { serviceId: service.id },
    });
    expect(scheduleCount).toBe(0);
  });
});
