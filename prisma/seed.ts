// Minimal Milestone 1 seed: just enough to exercise admin login and the
// employee access-token link end to end. The realistic full dataset
// (10 employees, 5 customers, recurring schedules, ...) is Milestone 8/9
// scope per PROJECT_SPEC.md section 31 — this is a narrower dev fixture.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const COMPANY_NAME = "Pulizie Demo Srl";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

function generateEmployeeAccessToken(): string {
  return randomBytes(32).toString("hex");
}

async function main() {
  let company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) {
    company = await prisma.company.create({ data: { name: COMPANY_NAME } });
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      companyId: company.id,
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: Role.ADMIN,
      mustChangePassword: false,
    },
  });

  let employee = await prisma.employee.findFirst({
    where: { companyId: company.id, firstName: "Mario", lastName: "Rossi" },
  });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        firstName: "Mario",
        lastName: "Rossi",
        accessToken: generateEmployeeAccessToken(),
      },
    });
  }

  console.log("\nSeed completato.");
  console.log(`Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Link dipendente (Mario Rossi): /app/${employee.accessToken}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
