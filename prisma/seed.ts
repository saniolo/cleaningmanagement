// Realistic dev seed dataset per PROJECT_SPEC.md section 31: 1 company,
// 1 admin, 10 employees, 7 customers, 10 services, multiple recurring
// schedules, 2 absence requests, several weekly assignments, 2 unassigned
// activities, 2 pending replacement requests — enough to exercise every
// MVP workflow immediately after a fresh `prisma migrate reset` without
// any manual data entry.
import { PrismaClient, Role, AbsenceType, AbsenceStatus, type Employee } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

import { generateAssignmentsForWindow } from "../lib/scheduling/generate";
import { addDaysToDateValue, dateStringToDateValue, getMondayOfWeek, startOfUtcDay } from "../lib/dates";

const prisma = new PrismaClient();

const COMPANY_NAME = "Pulizie Demo Srl";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

function generateEmployeeAccessToken(): string {
  return randomBytes(32).toString("hex");
}

const EMPLOYEE_NAMES = [
  ["Mario", "Rossi"],
  ["Giulia", "Bianchi"],
  ["Luca", "Ferrari"],
  ["Anna", "Colombo"],
  ["Marco", "Ricci"],
  ["Sara", "Marino"],
  ["Davide", "Greco"],
  ["Elena", "Bruno"],
  ["Francesco", "Gallo"],
  ["Chiara", "Conti"],
] as const;

interface CustomerSeed {
  name: string;
  addressLine: string;
  city: string;
  postalCode: string;
  province: string;
  services: { name: string; estimatedDurationMinutes: number; operationalNotes?: string }[];
}

// Customer now represents both the contractual customer and its single
// address (merged from what used to be separate Customer/Location models).
// A business with multiple sites — "Hotel Europa" had a dependance,
// "Condominio Bellavista" has two stairwells — is represented as multiple
// customer entries here, one per site, exactly as the production
// Customer/Location merge migration split existing multi-location
// customers into separate rows.
const CUSTOMERS: CustomerSeed[] = [
  {
    name: "Condominio Verdi",
    addressLine: "Via Roma 15",
    city: "Roma",
    postalCode: "00100",
    province: "RM",
    services: [
      {
        name: "Pulizia scale",
        estimatedDurationMinutes: 120,
        operationalNotes: "Chiavi dal portiere, citofono int. 1.",
      },
    ],
  },
  {
    name: "Studio Rossi",
    addressLine: "Via Carducci 8",
    city: "Roma",
    postalCode: "00185",
    province: "RM",
    services: [
      { name: "Pulizia uffici", estimatedDurationMinutes: 90 },
      { name: "Pulizia vetri", estimatedDurationMinutes: 45 },
    ],
  },
  {
    name: "Hotel Europa - Via Milano 22",
    addressLine: "Via Milano 22",
    city: "Milano",
    postalCode: "20121",
    province: "MI",
    services: [
      {
        name: "Pulizia camere",
        estimatedDurationMinutes: 180,
        operationalNotes: "Passare in reception per le chiavi master.",
      },
      { name: "Pulizia hall", estimatedDurationMinutes: 60 },
      { name: "Pulizia vetri", estimatedDurationMinutes: 90 },
    ],
  },
  {
    name: "Hotel Europa - Via Milano 24 (dependance)",
    addressLine: "Via Milano 24",
    city: "Milano",
    postalCode: "20121",
    province: "MI",
    services: [{ name: "Pulizia camere", estimatedDurationMinutes: 120 }],
  },
  {
    name: "Condominio Bellavista - Via Torino 5 - Scala A",
    addressLine: "Via Torino 5",
    city: "Torino",
    postalCode: "10121",
    province: "TO",
    services: [{ name: "Pulizia scale", estimatedDurationMinutes: 90 }],
  },
  {
    name: "Condominio Bellavista - Via Torino 5 - Scala B",
    addressLine: "Via Torino 5",
    city: "Torino",
    postalCode: "10121",
    province: "TO",
    services: [{ name: "Pulizia scale", estimatedDurationMinutes: 90 }],
  },
  {
    name: "Ufficio Legale Marchetti",
    addressLine: "Corso Italia 100",
    city: "Roma",
    postalCode: "00198",
    province: "RM",
    services: [
      {
        name: "Pulizia uffici",
        estimatedDurationMinutes: 60,
        operationalNotes: "Solo dopo le 19:00, ufficio aperto fino a tardi.",
      },
    ],
  },
];

// Not every service gets a recurrence — some are one-off/ad-hoc, matching
// realistic usage. Matched against the flattened service list built while
// seeding (see serviceRefs) by customerName + serviceName.
const RECURRENCES: {
  customerName: string;
  serviceName: string;
  dayOfWeek: number;
}[] = [
  { customerName: "Condominio Verdi", serviceName: "Pulizia scale", dayOfWeek: 1 },
  { customerName: "Condominio Verdi", serviceName: "Pulizia scale", dayOfWeek: 4 },
  { customerName: "Studio Rossi", serviceName: "Pulizia uffici", dayOfWeek: 2 },
  { customerName: "Studio Rossi", serviceName: "Pulizia uffici", dayOfWeek: 5 },
  { customerName: "Hotel Europa - Via Milano 22", serviceName: "Pulizia camere", dayOfWeek: 1 },
  { customerName: "Hotel Europa - Via Milano 22", serviceName: "Pulizia camere", dayOfWeek: 3 },
  { customerName: "Hotel Europa - Via Milano 22", serviceName: "Pulizia camere", dayOfWeek: 5 },
  { customerName: "Hotel Europa - Via Milano 22", serviceName: "Pulizia hall", dayOfWeek: 1 },
  { customerName: "Hotel Europa - Via Milano 22", serviceName: "Pulizia hall", dayOfWeek: 4 },
  {
    customerName: "Condominio Bellavista - Via Torino 5 - Scala A",
    serviceName: "Pulizia scale",
    dayOfWeek: 3,
  },
  {
    customerName: "Condominio Bellavista - Via Torino 5 - Scala B",
    serviceName: "Pulizia scale",
    dayOfWeek: 3,
  },
  { customerName: "Ufficio Legale Marchetti", serviceName: "Pulizia uffici", dayOfWeek: 5 },
];

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

  const existingEmployeeCount = await prisma.employee.count({ where: { companyId: company.id } });
  if (existingEmployeeCount > 0) {
    console.log("\nAzienda e admin già presenti con dati demo: seed dei dati bulk saltato.");
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
    return;
  }

  // --- Employees ---
  const employees: Employee[] = [];
  for (const [firstName, lastName] of EMPLOYEE_NAMES) {
    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        firstName,
        lastName,
        accessToken: generateEmployeeAccessToken(),
        phone: "333" + String(1000000 + employees.length).slice(-7),
      },
    });
    employees.push(employee);
  }

  // --- Customers -> Services ---
  const serviceRefs: { customerName: string; serviceName: string; id: string }[] = [];

  for (const customerSeed of CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        name: customerSeed.name,
        addressLine: customerSeed.addressLine,
        city: customerSeed.city,
        postalCode: customerSeed.postalCode,
        province: customerSeed.province,
      },
    });

    for (const serviceSeed of customerSeed.services) {
      const service = await prisma.service.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          name: serviceSeed.name,
          estimatedDurationMinutes: serviceSeed.estimatedDurationMinutes,
          operationalNotes: serviceSeed.operationalNotes,
        },
      });
      serviceRefs.push({
        customerName: customer.name,
        serviceName: service.name,
        id: service.id,
      });
    }
  }

  // --- Recurring schedules ---
  const today = startOfUtcDay(new Date());
  for (const recurrence of RECURRENCES) {
    const service = serviceRefs.find(
      (s) => s.customerName === recurrence.customerName && s.serviceName === recurrence.serviceName
    );
    if (!service) continue;

    const matching = await prisma.service.findUnique({ where: { id: service.id } });
    if (!matching) continue;

    await prisma.recurringSchedule.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        dayOfWeek: recurrence.dayOfWeek,
        estimatedDurationMinutes: matching.estimatedDurationMinutes,
        effectiveFrom: today,
      },
    });
  }

  // --- Generate dated assignments from the recurring schedules above ---
  await generateAssignmentsForWindow(company.id);

  // --- Staff the next two weeks, leaving exactly 4 uncovered near the start
  //     (2 plain unassigned, 2 with a pending replacement proposal).
  //     Anchored on `today` rather than the calendar week: generation never
  //     backfills days that have already passed within the current week, so
  //     a Monday-anchored window can come up short depending on what day of
  //     the week the seed happens to run on. A 14-day forward-looking pool
  //     is never empty and always has room to spare 4 for the demo. ---
  const weekStart = getMondayOfWeek(today);
  const stagingWindowEnd = addDaysToDateValue(today, 13);

  const stagingPool = await prisma.assignment.findMany({
    where: { companyId: company.id, date: { gte: today, lte: stagingWindowEnd } },
    orderBy: [{ date: "asc" }, { serviceId: "asc" }],
  });

  const UNCOVERED_COUNT = 4;
  const toLeaveUncovered = stagingPool.slice(0, UNCOVERED_COUNT);
  const toStaff = stagingPool.slice(UNCOVERED_COUNT);

  let employeeCursor = 0;
  for (const assignment of toStaff) {
    // Round-robin through employees — no more time-overlap check to skip
    // on, an employee can have any number of activities on the same day.
    const chosen = employees[employeeCursor % employees.length];
    employeeCursor++;

    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { employeeId: chosen.id, status: "ASSIGNED" },
    });
  }

  // Leave `toLeaveUncovered` as-is (already UNASSIGNED from generation) —
  // 2 stay plain, 2 get a pending replacement proposal below.
  const [plainUncovered1, plainUncovered2, proposed1, proposed2] = toLeaveUncovered;

  if (proposed1) {
    await prisma.replacementRequest.create({
      data: {
        companyId: company.id,
        assignmentId: proposed1.id,
        proposedEmployeeId: employees[0].id,
        status: "PENDING",
      },
    });
  }
  if (proposed2) {
    await prisma.replacementRequest.create({
      data: {
        companyId: company.id,
        assignmentId: proposed2.id,
        proposedEmployeeId: employees[1].id,
        status: "PENDING",
      },
    });
  }
  void plainUncovered1;
  void plainUncovered2;

  // --- Absence requests: one pending, one already approved ---
  const nextMonday = addDaysToDateValue(weekStart, 7);
  await prisma.absenceRequest.create({
    data: {
      companyId: company.id,
      employeeId: employees[2].id,
      type: AbsenceType.VACATION,
      startDate: nextMonday,
      endDate: addDaysToDateValue(nextMonday, 4),
      notes: "Ferie estive.",
      status: AbsenceStatus.PENDING,
    },
  });

  const pastMonday = addDaysToDateValue(weekStart, -7);
  await prisma.absenceRequest.create({
    data: {
      companyId: company.id,
      employeeId: employees[3].id,
      type: AbsenceType.SICKNESS,
      startDate: pastMonday,
      endDate: pastMonday,
      status: AbsenceStatus.APPROVED,
      reviewedAt: new Date(),
    },
  });

  const employeeLinks = employees
    .slice(0, 3)
    .map((e) => `  ${e.firstName} ${e.lastName}: /app/${e.accessToken}`)
    .join("\n");

  console.log("\nSeed completato.");
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(
    `${employees.length} dipendenti, ${CUSTOMERS.length} clienti, ${serviceRefs.length} servizi.`
  );
  console.log("Alcuni link dipendente:");
  console.log(employeeLinks);
  console.log();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
