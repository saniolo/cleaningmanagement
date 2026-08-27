import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { proposeReplacement } from "@/app/admin/unassigned/actions";
import {
  acceptReplacementRequest,
  rejectReplacementRequest,
} from "@/app/app/[token]/replacements/actions";
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

async function setupPendingReplacement(date = "2031-05-05") {
  const company = await createTestCompany();
  mockAdminSession(company.id);
  const employee = await createTestEmployee(company.id, "Target");
  const { service } = await createTestServiceChain(company.id);
  const assignment = await createTestAssignment({
    companyId: company.id,
    serviceId: service.id,
    date,
    startTime: "08:00",
    endTime: "10:00",
  });

  const proposeResult = await proposeReplacement(assignment.id, employee.id);
  expect(proposeResult.success).toBe(true);

  const replacement = await prisma.replacementRequest.findFirstOrThrow({
    where: { assignmentId: assignment.id, status: "PENDING" },
  });

  return { company, employee, assignment, replacement };
}

// PROJECT_SPEC.md section 32: "Accepted replacement assigns the employee.
// Rejected replacement leaves activity unassigned. A replacement cannot be
// accepted twice. Invalid/stale replacement requests cannot mutate
// assignments."
describe("acceptReplacementRequest", () => {
  it("assigns the employee and marks the request ACCEPTED", async () => {
    const { employee, assignment, replacement } = await setupPendingReplacement();

    const result = await acceptReplacementRequest(employee.accessToken, replacement.id);
    expect(result.success).toBe(true);

    const refreshedAssignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(refreshedAssignment.status).toBe("ASSIGNED");
    expect(refreshedAssignment.employeeId).toBe(employee.id);

    const refreshedRequest = await prisma.replacementRequest.findUniqueOrThrow({
      where: { id: replacement.id },
    });
    expect(refreshedRequest.status).toBe("ACCEPTED");
  });

  it("cannot be accepted twice — the second attempt fails and changes nothing", async () => {
    const { employee, replacement } = await setupPendingReplacement("2031-05-06");

    const first = await acceptReplacementRequest(employee.accessToken, replacement.id);
    expect(first.success).toBe(true);

    const second = await acceptReplacementRequest(employee.accessToken, replacement.id);
    expect(second.success).toBe(false);
  });

  it("under true concurrency, exactly one of two simultaneous accepts wins", async () => {
    const { employee, assignment, replacement } = await setupPendingReplacement("2031-05-07");

    const [a, b] = await Promise.all([
      acceptReplacementRequest(employee.accessToken, replacement.id),
      acceptReplacementRequest(employee.accessToken, replacement.id),
    ]);

    const successes = [a, b].filter((r) => r.success);
    expect(successes).toHaveLength(1);

    const refreshedAssignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(refreshedAssignment.status).toBe("ASSIGNED");
    expect(refreshedAssignment.employeeId).toBe(employee.id);
  });

  it("a stale request that lost the race (assignment taken elsewhere) cannot mutate the assignment", async () => {
    const { company, employee, assignment, replacement } =
      await setupPendingReplacement("2031-05-08");
    const otherEmployee = await createTestEmployee(company.id, "Other");

    // Simulate the assignment being filled through another path in the
    // meantime (direct admin assignment, or a second accepted proposal).
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: "ASSIGNED", employeeId: otherEmployee.id },
    });

    const result = await acceptReplacementRequest(employee.accessToken, replacement.id);
    expect(result.success).toBe(false);

    const refreshedAssignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(refreshedAssignment.employeeId).toBe(otherEmployee.id);

    const refreshedRequest = await prisma.replacementRequest.findUniqueOrThrow({
      where: { id: replacement.id },
    });
    expect(refreshedRequest.status).toBe("PENDING");
  });

  it("an invalid/unknown replacement request id cannot mutate anything", async () => {
    const company = await createTestCompany();
    const employee = await createTestEmployee(company.id);

    const result = await acceptReplacementRequest(employee.accessToken, "not-a-real-id");
    expect(result.success).toBe(false);
  });

  it("one employee cannot accept a replacement proposed to a different employee", async () => {
    const { company, replacement } = await setupPendingReplacement("2031-05-09");
    const impostor = await createTestEmployee(company.id, "Impostor");

    const result = await acceptReplacementRequest(impostor.accessToken, replacement.id);
    expect(result.success).toBe(false);

    const refreshedRequest = await prisma.replacementRequest.findUniqueOrThrow({
      where: { id: replacement.id },
    });
    expect(refreshedRequest.status).toBe("PENDING");
  });
});

describe("rejectReplacementRequest", () => {
  it("leaves the assignment UNASSIGNED and marks the request REJECTED", async () => {
    const { employee, assignment, replacement } = await setupPendingReplacement("2031-05-10");

    const result = await rejectReplacementRequest(employee.accessToken, replacement.id);
    expect(result.success).toBe(true);

    const refreshedAssignment = await prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(refreshedAssignment.status).toBe("UNASSIGNED");
    expect(refreshedAssignment.employeeId).toBeNull();

    const refreshedRequest = await prisma.replacementRequest.findUniqueOrThrow({
      where: { id: replacement.id },
    });
    expect(refreshedRequest.status).toBe("REJECTED");
  });

  it("the assignment is immediately proposable to someone else after a rejection", async () => {
    const { company, employee, assignment, replacement } =
      await setupPendingReplacement("2031-05-11");
    const nextEmployee = await createTestEmployee(company.id, "Next");

    const rejectResult = await rejectReplacementRequest(employee.accessToken, replacement.id);
    expect(rejectResult.success).toBe(true);

    const proposeResult = await proposeReplacement(assignment.id, nextEmployee.id);
    expect(proposeResult.success).toBe(true);
  });
});
