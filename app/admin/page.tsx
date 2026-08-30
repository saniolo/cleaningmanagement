import Link from "next/link";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  addDaysToDateValue,
  formatDateRangeIT,
  formatShortDateIT,
  getMondayOfWeek,
  startOfUtcDay,
} from "@/lib/dates";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminProfileForm } from "./admin-profile-form";

const PREVIEW_SIZE = 3;

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  // Scoped to the current week, not the whole 8-week generation horizon —
  // a company-wide all-time total (which can run into the hundreds once a
  // few services recur several times a week) reads as alarming and isn't
  // actually what needs attention right now; this week's count is.
  const weekStart = getMondayOfWeek(startOfUtcDay(new Date()));
  const weekEnd = addDaysToDateValue(weekStart, 6);

  const [
    currentUser,
    pendingAbsencesCount,
    pendingAbsenceItems,
    unassignedCount,
    unassignedItems,
    pendingConfirmationsCount,
    pendingConfirmationItems,
  ] = admin
    ? await Promise.all([
        // Read fresh from the DB rather than trusting the session — the JWT
        // keeps the email/name it had at login until the next sign-in, so
        // right after editing the profile the session would still show the
        // old values.
        prisma.user.findUniqueOrThrow({ where: { id: admin.id } }),
        prisma.absenceRequest.count({
          where: { companyId: admin.companyId, status: "PENDING" },
        }),
        prisma.absenceRequest.findMany({
          where: { companyId: admin.companyId, status: "PENDING" },
          include: { employee: true },
          orderBy: { startDate: "asc" },
          take: PREVIEW_SIZE,
        }),
        prisma.assignment.count({
          where: {
            companyId: admin.companyId,
            status: "UNASSIGNED",
            date: { gte: weekStart, lte: weekEnd },
          },
        }),
        prisma.assignment.findMany({
          where: {
            companyId: admin.companyId,
            status: "UNASSIGNED",
            date: { gte: weekStart, lte: weekEnd },
          },
          include: { service: { include: { customer: true } } },
          orderBy: { date: "asc" },
          take: PREVIEW_SIZE,
        }),
        prisma.assignment.count({
          where: {
            companyId: admin.companyId,
            status: "ASSIGNED",
            requiresConfirmation: true,
            confirmedAt: null,
            date: { gte: weekStart, lte: weekEnd },
          },
        }),
        prisma.assignment.findMany({
          where: {
            companyId: admin.companyId,
            status: "ASSIGNED",
            requiresConfirmation: true,
            confirmedAt: null,
            date: { gte: weekStart, lte: weekEnd },
          },
          include: { service: { include: { customer: true } }, employee: true },
          orderBy: { date: "asc" },
          take: PREVIEW_SIZE,
        }),
      ])
    : [null, 0, [], 0, [], 0, []];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          currentUser
            ? `Bentornato, ${currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.email}.`
            : "Riepilogo operativo della settimana."
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/absences">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Richieste di assenza in attesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{pendingAbsencesCount}</div>
              {pendingAbsenceItems.length > 0 && (
                <ul className="mt-3 space-y-1 border-t pt-3">
                  {pendingAbsenceItems.map((a) => (
                    <li key={a.id} className="truncate text-xs text-muted-foreground">
                      {a.employee.firstName} {a.employee.lastName} —{" "}
                      {ABSENCE_TYPE_LABELS_IT[a.type] ?? a.type},{" "}
                      {formatDateRangeIT(a.startDate, a.endDate)}
                    </li>
                  ))}
                  {pendingAbsencesCount > pendingAbsenceItems.length && (
                    <li className="text-xs text-muted-foreground">
                      +{pendingAbsencesCount - pendingAbsenceItems.length} altre
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/planning">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attività da assegnare questa settimana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{unassignedCount}</div>
              {unassignedItems.length > 0 && (
                <ul className="mt-3 space-y-1 border-t pt-3">
                  {unassignedItems.map((a) => (
                    <li key={a.id} className="truncate text-xs text-muted-foreground">
                      {a.service.name} — {a.service.customer.name}, {formatShortDateIT(a.date)}
                    </li>
                  ))}
                  {unassignedCount > unassignedItems.length && (
                    <li className="text-xs text-muted-foreground">
                      +{unassignedCount - unassignedItems.length} altre
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/planning">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attività da confermare questa settimana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{pendingConfirmationsCount}</div>
              {pendingConfirmationItems.length > 0 && (
                <ul className="mt-3 space-y-1 border-t pt-3">
                  {pendingConfirmationItems.map((a) => (
                    <li key={a.id} className="truncate text-xs text-muted-foreground">
                      {a.service.name} — {a.service.customer.name} ({a.employee?.firstName}{" "}
                      {a.employee?.lastName}), {formatShortDateIT(a.date)}
                    </li>
                  ))}
                  {pendingConfirmationsCount > pendingConfirmationItems.length && (
                    <li className="text-xs text-muted-foreground">
                      +{pendingConfirmationsCount - pendingConfirmationItems.length} altre
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {currentUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Il tuo account
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {currentUser.firstName
                  ? `${currentUser.firstName} ${currentUser.lastName}`
                  : "Nome non impostato"}
              </div>
              <div className="truncate text-sm text-muted-foreground">{currentUser.email}</div>
            </div>
            <AdminProfileForm
              admin={{
                firstName: currentUser.firstName ?? "",
                lastName: currentUser.lastName ?? "",
                email: currentUser.email,
              }}
              trigger={
                <Button variant="outline" size="sm" className="shrink-0">
                  Modifica
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
