import { getCurrentAdmin } from "@/lib/auth/session";
import { MONTH_STRING_PATTERN, currentMonthString } from "@/lib/dates";
import {
  getMonthlyHours,
  minutesToDecimalHoursIT,
  sumMonthlyHours,
} from "@/lib/reports/monthly-hours";

const HEADER = [
  "Dipendente",
  "Stato",
  "Ordinarie (h)",
  "Straordinari (h)",
  "Straordinari da confermare (h)",
  "Ferie (h)",
  "Permessi (h)",
  "Malattia (h)",
  "Totale (h)",
];

// Quote only when needed; double any embedded quote. Separator is ";" and
// decimals use "," so the file opens cleanly in an Italian-locale Excel.
function csvCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Non autorizzato", { status: 401 });

  const monthParam = new URL(request.url).searchParams.get("month");
  const month =
    monthParam && MONTH_STRING_PATTERN.test(monthParam) ? monthParam : currentMonthString();

  const { rows } = await getMonthlyHours(admin.companyId, month);
  const totals = sumMonthlyHours(rows);

  const body = [
    HEADER,
    ...rows.map((r) => [
      `${r.lastName} ${r.firstName}`,
      r.active ? "Attivo" : "Disattivato",
      minutesToDecimalHoursIT(r.ordinaryMinutes),
      minutesToDecimalHoursIT(r.overtimeMinutes),
      minutesToDecimalHoursIT(r.pendingOvertimeMinutes),
      minutesToDecimalHoursIT(r.vacationMinutes),
      minutesToDecimalHoursIT(r.permissionMinutes),
      minutesToDecimalHoursIT(r.sicknessMinutes),
      minutesToDecimalHoursIT(r.totalMinutes),
    ]),
    [
      "Totale generale",
      "",
      minutesToDecimalHoursIT(totals.ordinaryMinutes),
      minutesToDecimalHoursIT(totals.overtimeMinutes),
      minutesToDecimalHoursIT(totals.pendingOvertimeMinutes),
      minutesToDecimalHoursIT(totals.vacationMinutes),
      minutesToDecimalHoursIT(totals.permissionMinutes),
      minutesToDecimalHoursIT(totals.sicknessMinutes),
      minutesToDecimalHoursIT(totals.totalMinutes),
    ],
  ]
    .map((cells) => cells.map(csvCell).join(";"))
    .join("\r\n");

  // Leading BOM (U+FEFF) so Excel detects UTF-8 and renders accented names
  // correctly.
  return new Response(`﻿${body}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="riepilogo-ore-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
