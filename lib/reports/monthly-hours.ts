import type { AbsenceType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { monthStringToRange } from "@/lib/dates";

// Per-employee hours breakdown for one calendar month. All figures are in
// minutes; the UI/CSV layer decides how to render them.
//
// - ordinaryMinutes: assigned activities in the month with no confirmation
//   required.
// - overtimeMinutes ("straordinari"): confirmation-required activities the
//   employee actually accepted (confirmedAt set). Per the agreed rule, an
//   activity that requires confirmation IS the definition of overtime here.
// - pendingOvertimeMinutes: confirmation-required activities still awaiting
//   the employee's answer — shown separately, never folded into the total.
// - vacation/permission/sicknessMinutes: hours that were scheduled for the
//   employee on days later covered by an APPROVED absence, attributed by the
//   absence's type. Sourced from Assignment.freedByAbsenceId, stamped when
//   the absence was approved.
// - totalMinutes: ordinary + overtime + vacation + permission + sickness
//   (pending overtime excluded).
export interface EmployeeMonthlyHours {
  employeeId: string;
  firstName: string;
  lastName: string;
  active: boolean;
  ordinaryMinutes: number;
  overtimeMinutes: number;
  pendingOvertimeMinutes: number;
  vacationMinutes: number;
  permissionMinutes: number;
  sicknessMinutes: number;
  totalMinutes: number;
}

const ABSENCE_MINUTES_FIELD: Record<
  AbsenceType,
  "vacationMinutes" | "permissionMinutes" | "sicknessMinutes"
> = {
  VACATION: "vacationMinutes",
  PERMISSION: "permissionMinutes",
  SICKNESS: "sicknessMinutes",
};

export interface MonthlyHoursResult {
  rows: EmployeeMonthlyHours[];
  start: Date;
  end: Date;
}

export async function getMonthlyHours(
  companyId: string,
  month: string
): Promise<MonthlyHoursResult> {
  const { start, end } = monthStringToRange(month);

  const [employees, worked, freed] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.assignment.findMany({
      where: {
        companyId,
        employeeId: { not: null },
        date: { gte: start, lte: end },
      },
      select: {
        employeeId: true,
        durationMinutes: true,
        requiresConfirmation: true,
        confirmedAt: true,
      },
    }),
    prisma.assignment.findMany({
      where: {
        companyId,
        freedByAbsenceId: { not: null },
        date: { gte: start, lte: end },
      },
      select: {
        durationMinutes: true,
        freedByAbsence: { select: { employeeId: true, type: true } },
      },
    }),
  ]);

  const allRows: EmployeeMonthlyHours[] = employees.map((e) => ({
    employeeId: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    active: e.active,
    ordinaryMinutes: 0,
    overtimeMinutes: 0,
    pendingOvertimeMinutes: 0,
    vacationMinutes: 0,
    permissionMinutes: 0,
    sicknessMinutes: 0,
    totalMinutes: 0,
  }));
  const rowsById = new Map(allRows.map((row) => [row.employeeId, row]));

  for (const a of worked) {
    if (!a.employeeId) continue;
    const row = rowsById.get(a.employeeId);
    if (!row) continue;
    if (!a.requiresConfirmation) {
      row.ordinaryMinutes += a.durationMinutes;
    } else if (a.confirmedAt) {
      row.overtimeMinutes += a.durationMinutes;
    } else {
      row.pendingOvertimeMinutes += a.durationMinutes;
    }
  }

  for (const f of freed) {
    const ref = f.freedByAbsence;
    if (!ref) continue;
    const row = rowsById.get(ref.employeeId);
    if (!row) continue;
    row[ABSENCE_MINUTES_FIELD[ref.type]] += f.durationMinutes;
  }

  for (const row of allRows) {
    row.totalMinutes =
      row.ordinaryMinutes +
      row.overtimeMinutes +
      row.vacationMinutes +
      row.permissionMinutes +
      row.sicknessMinutes;
  }

  // Drop inactive employees with nothing in the month; keep every active one
  // so the report doubles as a "who has no hours yet" check.
  const rows = allRows
    .filter((r) => r.active || r.totalMinutes > 0 || r.pendingOvertimeMinutes > 0)
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, "it") ||
        a.firstName.localeCompare(b.firstName, "it")
    );

  return { rows, start, end };
}

export interface MonthlyHoursTotals {
  ordinaryMinutes: number;
  overtimeMinutes: number;
  pendingOvertimeMinutes: number;
  vacationMinutes: number;
  permissionMinutes: number;
  sicknessMinutes: number;
  totalMinutes: number;
}

export function sumMonthlyHours(rows: EmployeeMonthlyHours[]): MonthlyHoursTotals {
  return rows.reduce<MonthlyHoursTotals>(
    (acc, r) => ({
      ordinaryMinutes: acc.ordinaryMinutes + r.ordinaryMinutes,
      overtimeMinutes: acc.overtimeMinutes + r.overtimeMinutes,
      pendingOvertimeMinutes: acc.pendingOvertimeMinutes + r.pendingOvertimeMinutes,
      vacationMinutes: acc.vacationMinutes + r.vacationMinutes,
      permissionMinutes: acc.permissionMinutes + r.permissionMinutes,
      sicknessMinutes: acc.sicknessMinutes + r.sicknessMinutes,
      totalMinutes: acc.totalMinutes + r.totalMinutes,
    }),
    {
      ordinaryMinutes: 0,
      overtimeMinutes: 0,
      pendingOvertimeMinutes: 0,
      vacationMinutes: 0,
      permissionMinutes: 0,
      sicknessMinutes: 0,
      totalMinutes: 0,
    }
  );
}

// "8 h 30 min" / "45 min" / "8 h" — readable form for the on-screen table.
export function formatMinutesAsHoursIT(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// "8,50" — decimal hours with an Italian comma, for the CSV where the value
// needs to be summable in a spreadsheet.
export function minutesToDecimalHoursIT(minutes: number): string {
  return (minutes / 60).toFixed(2).replace(".", ",");
}
