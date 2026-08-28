import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { createCustomer, deleteCustomer } from "@/app/admin/customers/actions";
import { createActivityTemplate } from "@/app/admin/customers/activity-template-actions";
import { createTestAssignment, createTestCompany, createTestServiceChain } from "./helpers";

function mockAdminSession(companyId: string) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "test-admin", email: "admin@test.local", role: "ADMIN", companyId },
  } as never);
}

describe("createActivityTemplate", () => {
  it("creates a reusable catalog entry", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);

    const result = await createActivityTemplate({
      name: "Pulizia scale",
      estimatedDurationMinutes: 60,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("Pulizia scale");

    const stored = await prisma.activityTemplate.findUniqueOrThrow({
      where: { id: result.data.id },
    });
    expect(stored.companyId).toBe(company.id);
  });

  it("rejects a duplicate name within the same company", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);

    await createActivityTemplate({ name: "Mastelli", estimatedDurationMinutes: 15 });
    const result = await createActivityTemplate({ name: "Mastelli", estimatedDurationMinutes: 20 });

    expect(result.success).toBe(false);
    const count = await prisma.activityTemplate.count({
      where: { companyId: company.id, name: "Mastelli" },
    });
    expect(count).toBe(1);
  });

  it("allows the same name in a different company", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();

    mockAdminSession(companyA.id);
    const resultA = await createActivityTemplate({ name: "Mastelli", estimatedDurationMinutes: 15 });
    expect(resultA.success).toBe(true);

    mockAdminSession(companyB.id);
    const resultB = await createActivityTemplate({ name: "Mastelli", estimatedDurationMinutes: 15 });
    expect(resultB.success).toBe(true);
  });
});

describe("createCustomer", () => {
  it("creates the customer with its address and one service per selected template", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);

    const scale = await createActivityTemplate({ name: "Pulizia scale", estimatedDurationMinutes: 60 });
    const mastelli = await createActivityTemplate({ name: "Mastelli", estimatedDurationMinutes: 15 });
    if (!scale.success || !mastelli.success) throw new Error("setup failed");

    const result = await createCustomer({
      name: "Condominio Test",
      addressLine: "Via Test 1",
      city: "Roma",
      postalCode: "00100",
      province: "RM",
      activities: [
        { activityTemplateId: scale.data.id, daysOfWeek: [1, 3] },
        { activityTemplateId: mastelli.data.id, daysOfWeek: [] },
      ],
    });
    expect(result.success).toBe(true);

    const customer = await prisma.customer.findFirstOrThrow({
      where: { companyId: company.id, name: "Condominio Test" },
    });
    expect(customer.addressLine).toBe("Via Test 1");

    const services = await prisma.service.findMany({
      where: { customerId: customer.id },
      orderBy: { name: "asc" },
    });
    expect(services.map((s) => s.name)).toEqual(["Mastelli", "Pulizia scale"]);
    expect(services.find((s) => s.name === "Mastelli")?.estimatedDurationMinutes).toBe(15);

    // The occurrence picked for "Pulizia scale" (Mon/Wed) created its own
    // RecurringSchedule rows; "Mastelli" had no days selected, so it stays
    // schedule-free.
    const scaleService = services.find((s) => s.name === "Pulizia scale")!;
    const scaleSchedules = await prisma.recurringSchedule.findMany({
      where: { serviceId: scaleService.id },
      orderBy: { dayOfWeek: "asc" },
    });
    expect(scaleSchedules.map((s) => s.dayOfWeek)).toEqual([1, 3]);

    const mastelliService = services.find((s) => s.name === "Mastelli")!;
    const mastelliScheduleCount = await prisma.recurringSchedule.count({
      where: { serviceId: mastelliService.id },
    });
    expect(mastelliScheduleCount).toBe(0);
  });

  it("creates the customer with no services when no template is selected", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);

    const result = await createCustomer({
      name: "Condominio Vuoto",
      addressLine: "Via Test 2",
      city: "Roma",
      postalCode: "00100",
      province: "RM",
      activities: [],
    });
    expect(result.success).toBe(true);

    const customer = await prisma.customer.findFirstOrThrow({
      where: { companyId: company.id, name: "Condominio Vuoto" },
    });
    const serviceCount = await prisma.service.count({ where: { customerId: customer.id } });
    expect(serviceCount).toBe(0);
  });

  it("ignores a template id belonging to another company", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();

    mockAdminSession(companyB.id);
    const foreignTemplate = await createActivityTemplate({
      name: "Pulizia scale",
      estimatedDurationMinutes: 60,
    });
    if (!foreignTemplate.success) throw new Error("setup failed");

    mockAdminSession(companyA.id);
    const result = await createCustomer({
      name: "Condominio A",
      addressLine: "Via Test 3",
      city: "Roma",
      postalCode: "00100",
      province: "RM",
      activities: [{ activityTemplateId: foreignTemplate.data.id, daysOfWeek: [] }],
    });
    expect(result.success).toBe(true);

    const customer = await prisma.customer.findFirstOrThrow({
      where: { companyId: companyA.id, name: "Condominio A" },
    });
    const serviceCount = await prisma.service.count({ where: { customerId: customer.id } });
    expect(serviceCount).toBe(0);
  });
});

describe("deleteCustomer", () => {
  it("deletes the customer and its services, cascading to schedules and assignments", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { customer, service } = await createTestServiceChain(company.id);
    await prisma.recurringSchedule.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        dayOfWeek: 1,
        estimatedDurationMinutes: 60,
        effectiveFrom: new Date("2031-01-01T00:00:00Z"),
      },
    });
    await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-06-02",
    });

    const result = await deleteCustomer(customer.id);
    expect(result.success).toBe(true);

    expect(await prisma.customer.findUnique({ where: { id: customer.id } })).toBeNull();
    expect(await prisma.service.count({ where: { customerId: customer.id } })).toBe(0);
    expect(await prisma.recurringSchedule.count({ where: { serviceId: service.id } })).toBe(0);
    expect(await prisma.assignment.count({ where: { serviceId: service.id } })).toBe(0);
  });

  it("refuses to delete a customer belonging to another company", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    const { customer } = await createTestServiceChain(companyA.id);

    mockAdminSession(companyB.id);
    const result = await deleteCustomer(customer.id);
    expect(result.success).toBe(false);

    expect(await prisma.customer.findUnique({ where: { id: customer.id } })).not.toBeNull();
  });
});
