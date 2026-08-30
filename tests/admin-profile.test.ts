import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { updateAdminProfile } from "@/app/admin/actions";
import { createTestAdminUser, createTestCompany } from "./helpers";

const CURRENT_PASSWORD = "password123";

function mockSessionFor(user: { id: string; email: string; companyId: string }) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: user.id, email: user.email, role: "ADMIN", companyId: user.companyId },
  } as never);
}

describe("updateAdminProfile", () => {
  it("updates name and email when the current password is correct", async () => {
    const company = await createTestCompany();
    const admin = await createTestAdminUser(company.id);
    mockSessionFor(admin);

    const result = await updateAdminProfile({
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario.rossi@test.local",
      currentPassword: CURRENT_PASSWORD,
      newPassword: undefined,
    });
    expect(result.success).toBe(true);

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(refreshed.firstName).toBe("Mario");
    expect(refreshed.lastName).toBe("Rossi");
    expect(refreshed.email).toBe("mario.rossi@test.local");
    // Password untouched when newPassword is omitted.
    expect(await bcrypt.compare(CURRENT_PASSWORD, refreshed.password)).toBe(true);
  });

  it("rejects the change when the current password is wrong", async () => {
    const company = await createTestCompany();
    const admin = await createTestAdminUser(company.id);
    mockSessionFor(admin);

    const result = await updateAdminProfile({
      firstName: "Mario",
      lastName: "Rossi",
      email: admin.email,
      currentPassword: "not-the-right-password",
      newPassword: undefined,
    });
    expect(result.success).toBe(false);

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(refreshed.firstName).toBeNull();
  });

  it("updates the password when a new one is provided", async () => {
    const company = await createTestCompany();
    const admin = await createTestAdminUser(company.id);
    mockSessionFor(admin);

    const result = await updateAdminProfile({
      firstName: "Mario",
      lastName: "Rossi",
      email: admin.email,
      currentPassword: CURRENT_PASSWORD,
      newPassword: "brand-new-password",
    });
    expect(result.success).toBe(true);

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(await bcrypt.compare("brand-new-password", refreshed.password)).toBe(true);
    expect(await bcrypt.compare(CURRENT_PASSWORD, refreshed.password)).toBe(false);
  });

  it("rejects an email already used by another account", async () => {
    const company = await createTestCompany();
    const admin = await createTestAdminUser(company.id);
    const other = await createTestAdminUser(company.id);
    mockSessionFor(admin);

    const result = await updateAdminProfile({
      firstName: "Mario",
      lastName: "Rossi",
      email: other.email,
      currentPassword: CURRENT_PASSWORD,
      newPassword: undefined,
    });
    expect(result.success).toBe(false);

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(refreshed.email).toBe(admin.email);
  });
});
