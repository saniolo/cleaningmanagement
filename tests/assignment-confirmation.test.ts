import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { updateAssignment } from "@/app/admin/planning/actions";
import { confirmAssignment, rejectAssignment } from "@/app/app/[token]/confirm-actions";
import { dateValueToDateString } from "@/lib/dates";
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

describe("assigning with requiresConfirmation", () => {
  it("checking it leaves the activity ASSIGNED but unconfirmed", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-04",
    });

    const result = await updateAssignment(assignment.id, {
      date: dateValueToDateString(assignment.date),
      durationMinutes: assignment.durationMinutes,
      employeeId: employee.id,
      requiresConfirmation: true,
    });
    expect(result.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.status).toBe("ASSIGNED");
    expect(refreshed.employeeId).toBe(employee.id);
    expect(refreshed.requiresConfirmation).toBe(true);
    expect(refreshed.confirmedAt).toBeNull();
  });

  it("without an employee, requiresConfirmation never sticks", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-05",
    });

    const result = await updateAssignment(assignment.id, {
      date: dateValueToDateString(assignment.date),
      durationMinutes: assignment.durationMinutes,
      employeeId: undefined,
      requiresConfirmation: true,
    });
    expect(result.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.status).toBe("UNASSIGNED");
    expect(refreshed.requiresConfirmation).toBe(false);
  });

  it("editing the assignment while it's already confirmed resets it back to pending", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-06",
      employeeId: employee.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true, confirmedAt: new Date() },
    });

    // Same employee, but the duration changes — what the employee confirmed
    // no longer matches, so it must go back to pending.
    const result = await updateAssignment(assignment.id, {
      date: dateValueToDateString(assignment.date),
      durationMinutes: assignment.durationMinutes + 30,
      employeeId: employee.id,
      requiresConfirmation: true,
    });
    expect(result.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.requiresConfirmation).toBe(true);
    expect(refreshed.confirmedAt).toBeNull();
  });

  it("re-saving the exact same details keeps an existing confirmation", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-07",
      employeeId: employee.id,
    });
    const confirmedAt = new Date();
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true, confirmedAt },
    });

    const result = await updateAssignment(assignment.id, {
      date: dateValueToDateString(assignment.date),
      durationMinutes: assignment.durationMinutes,
      employeeId: employee.id,
      requiresConfirmation: true,
    });
    expect(result.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.confirmedAt?.getTime()).toBe(confirmedAt.getTime());
  });
});

describe("confirmAssignment", () => {
  it("the assigned employee can confirm a pending activity", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-08",
      employeeId: employee.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const result = await confirmAssignment(employee.accessToken, assignment.id);
    expect(result.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.confirmedAt).not.toBeNull();
  });

  it("cannot be confirmed twice", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-09",
      employeeId: employee.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const first = await confirmAssignment(employee.accessToken, assignment.id);
    expect(first.success).toBe(true);
    const second = await confirmAssignment(employee.accessToken, assignment.id);
    expect(second.success).toBe(false);
  });

  it("a different employee cannot confirm someone else's activity", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const owner = await createTestEmployee(company.id, "Owner");
    const impostor = await createTestEmployee(company.id, "Impostor");
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-10",
      employeeId: owner.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const result = await confirmAssignment(impostor.accessToken, assignment.id);
    expect(result.success).toBe(false);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.confirmedAt).toBeNull();
  });

  it("an activity that never required confirmation cannot be confirmed", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-11",
      employeeId: employee.id,
    });

    const result = await confirmAssignment(employee.accessToken, assignment.id);
    expect(result.success).toBe(false);
  });

  it("under true concurrency, exactly one of two simultaneous confirms wins", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-16",
      employeeId: employee.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const [a, b] = await Promise.all([
      confirmAssignment(employee.accessToken, assignment.id),
      confirmAssignment(employee.accessToken, assignment.id),
    ]);

    const successes = [a, b].filter((r) => r.success);
    expect(successes).toHaveLength(1);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.confirmedAt).not.toBeNull();
  });
});

// This is the accept/reject half of the unified "Richiede conferma"
// mechanism that replaced the old propose/accept/reject replacement-request
// workflow — rejecting here plays exactly the role rejecting a replacement
// proposal used to: the activity goes back to UNASSIGNED, immediately
// proposable to someone else, with no separate "rejected by X" record left
// behind (there's nothing left to own once nobody's assigned).
describe("rejectAssignment", () => {
  it("frees the activity back to UNASSIGNED", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-12",
      employeeId: employee.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const result = await rejectAssignment(employee.accessToken, assignment.id);
    expect(result.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.status).toBe("UNASSIGNED");
    expect(refreshed.employeeId).toBeNull();
    expect(refreshed.requiresConfirmation).toBe(false);
    expect(refreshed.confirmedAt).toBeNull();
  });

  it("is immediately assignable to someone else after a rejection", async () => {
    const company = await createTestCompany();
    mockAdminSession(company.id);
    const { service } = await createTestServiceChain(company.id);
    const first = await createTestEmployee(company.id, "First");
    const next = await createTestEmployee(company.id, "Next");
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-13",
      employeeId: first.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const rejectResult = await rejectAssignment(first.accessToken, assignment.id);
    expect(rejectResult.success).toBe(true);

    const reassignResult = await updateAssignment(assignment.id, {
      date: dateValueToDateString(assignment.date),
      durationMinutes: assignment.durationMinutes,
      employeeId: next.id,
      requiresConfirmation: true,
    });
    expect(reassignResult.success).toBe(true);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.employeeId).toBe(next.id);
    expect(refreshed.requiresConfirmation).toBe(true);
    expect(refreshed.confirmedAt).toBeNull();
  });

  it("cannot be rejected twice", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const employee = await createTestEmployee(company.id);
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-14",
      employeeId: employee.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const first = await rejectAssignment(employee.accessToken, assignment.id);
    expect(first.success).toBe(true);
    const second = await rejectAssignment(employee.accessToken, assignment.id);
    expect(second.success).toBe(false);
  });

  it("a different employee cannot reject someone else's activity", async () => {
    const company = await createTestCompany();
    const { service } = await createTestServiceChain(company.id);
    const owner = await createTestEmployee(company.id, "Owner");
    const impostor = await createTestEmployee(company.id, "Impostor");
    const assignment = await createTestAssignment({
      companyId: company.id,
      serviceId: service.id,
      date: "2031-07-15",
      employeeId: owner.id,
    });
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { requiresConfirmation: true },
    });

    const result = await rejectAssignment(impostor.accessToken, assignment.id);
    expect(result.success).toBe(false);

    const refreshed = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(refreshed.employeeId).toBe(owner.id);
  });
});
