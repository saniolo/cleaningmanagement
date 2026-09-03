import { redirect } from "next/navigation";
import { Download } from "lucide-react";

import { getCurrentAdmin } from "@/lib/auth/session";
import { MONTH_STRING_PATTERN, currentMonthString, formatMonthLabelIT } from "@/lib/dates";
import {
  formatMinutesAsHoursIT,
  getMonthlyHours,
  sumMonthlyHours,
} from "@/lib/reports/monthly-hours";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthNavigation } from "./month-navigation";

export const metadata = { title: "Riepilogo ore" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const month =
    searchParams.month && MONTH_STRING_PATTERN.test(searchParams.month)
      ? searchParams.month
      : currentMonthString();

  const { rows } = await getMonthlyHours(admin.companyId, month);
  const totals = sumMonthlyHours(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riepilogo ore"
        description={`Ore per dipendente — ${formatMonthLabelIT(month)}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <MonthNavigation month={month} basePath="/admin/reports" />
            <Button asChild variant="outline" size="sm">
              <a href={`/admin/reports/export?month=${month}`}>
                <Download className="mr-2 h-4 w-4" />
                Esporta CSV
              </a>
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nessun dato per questo mese."
          description="Non risultano attività assegnate né assenze approvate nel periodo selezionato."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dipendente</TableHead>
                <TableHead className="text-right">Ordinarie</TableHead>
                <TableHead className="text-right">Straordinari</TableHead>
                <TableHead className="text-right">Ferie</TableHead>
                <TableHead className="text-right">Permessi</TableHead>
                <TableHead className="text-right">Malattia</TableHead>
                <TableHead className="text-right">Assenze</TableHead>
                <TableHead className="text-right">Totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.employeeId}>
                  <TableCell className="font-medium">
                    {r.lastName} {r.firstName}
                    {!r.active && (
                      <span className="ml-2 text-xs text-muted-foreground">(disattivato)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutesAsHoursIT(r.ordinaryMinutes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutesAsHoursIT(r.overtimeMinutes)}
                    {r.pendingOvertimeMinutes > 0 && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        +{formatMinutesAsHoursIT(r.pendingOvertimeMinutes)} da confermare
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutesAsHoursIT(r.vacationMinutes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutesAsHoursIT(r.permissionMinutes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutesAsHoursIT(r.sicknessMinutes)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMinutesAsHoursIT(r.absenceMinutes)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMinutesAsHoursIT(r.totalMinutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Totale generale</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.ordinaryMinutes)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.overtimeMinutes)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.vacationMinutes)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.permissionMinutes)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.sicknessMinutes)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.absenceMinutes)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMinutesAsHoursIT(totals.totalMinutes)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      <p className="max-w-3xl text-xs text-muted-foreground">
        <strong>Ordinarie</strong>: attività assegnate nel mese senza richiesta di conferma.{" "}
        <strong>Straordinari</strong>: attività da confermare che il dipendente ha accettato; quelle
        ancora in sospeso a fine mese sono indicate a parte e non entrano nel totale.{" "}
        <strong>Ferie / Permessi / Malattia</strong>: ore delle attività che risultavano pianificate
        per il dipendente nei giorni di un&apos;assenza approvata. <strong>Assenze</strong> è la somma
        di Ferie, Permessi e Malattia. Il <strong>Totale</strong> è Ordinarie + Straordinari +
        Assenze per ciascun dipendente.
      </p>
    </div>
  );
}
