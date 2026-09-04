import { CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  addDaysToDateValue,
  DAY_OF_WEEK_LABELS_IT,
  DAY_OF_WEEK_SHORT_LABELS_IT,
  dateValueToDateString,
  formatDateRangeIT,
  formatLongDateIT,
  formatShortDateIT,
  getMondayOfWeek,
  startOfUtcDay,
} from "@/lib/dates";
import { ABSENCE_TYPE_LABELS_IT } from "@/lib/validation/absence";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/admin/dashboard/dashboard-header";
import { KpiCard, KpiPreviewMore, KpiPreviewRow } from "@/components/admin/dashboard/kpi-card";
import { WeekOverviewCard } from "@/components/admin/dashboard/week-overview-card";
import { AccountCard } from "@/components/admin/dashboard/account-card";
import { AdminProfileForm } from "./admin-profile-form";

const PREVIEW_SIZE = 3;
const ROLE_LABEL = "Amministratore";

function initialsOf(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const first = (u.firstName ?? "").trim();
  const last = (u.lastName ?? "").trim();
  const fromName = `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  return fromName || u.email.slice(0, 2).toUpperCase();
}

// Elegant empty state used inside a KPI card when there is nothing to act on.
function KpiEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </span>
      <p className="mt-2 text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}

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
    weekAssignments,
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
        // Per-day overview for the current week — same Assignment model and
        // week window already queried above, just grouped by day for the
        // planning snapshot card.
        prisma.assignment.findMany({
          where: {
            companyId: admin.companyId,
            date: { gte: weekStart, lte: weekEnd },
          },
          select: { date: true, status: true },
        }),
      ])
    : [null, 0, [], 0, [], 0, [], []];

  const today = startOfUtcDay(new Date());
  const todayStr = dateValueToDateString(today);
  const dateLabel = `${DAY_OF_WEEK_LABELS_IT[today.getUTCDay()]}, ${formatLongDateIT(today)}`;

  const displayName = currentUser
    ? currentUser.firstName
      ? `${currentUser.firstName} ${currentUser.lastName ?? ""}`.trim()
      : currentUser.email
    : "";
  const initials = currentUser ? initialsOf(currentUser) : "";
  const greeting = currentUser
    ? `Bentornato, ${displayName}`
    : "Riepilogo operativo della settimana.";

  const countsByDate = new Map<string, { total: number; unassigned: number }>();
  for (const a of weekAssignments) {
    const key = dateValueToDateString(a.date);
    const entry = countsByDate.get(key) ?? { total: 0, unassigned: 0 };
    entry.total += 1;
    if (a.status === "UNASSIGNED") entry.unassigned += 1;
    countsByDate.set(key, entry);
  }
  const overviewDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysToDateValue(weekStart, i);
    const key = dateValueToDateString(d);
    const c = countsByDate.get(key) ?? { total: 0, unassigned: 0 };
    return {
      key,
      weekday: DAY_OF_WEEK_SHORT_LABELS_IT[d.getUTCDay()].toUpperCase(),
      dayNum: String(d.getUTCDate()).padStart(2, "0"),
      total: c.total,
      unassigned: c.unassigned,
      isToday: key === todayStr,
    };
  });

  const profileFormAdmin = currentUser
    ? {
        firstName: currentUser.firstName ?? "",
        lastName: currentUser.lastName ?? "",
        email: currentUser.email,
        mustChangePassword: currentUser.mustChangePassword,
      }
    : null;

  return (
    <div className="space-y-6">
      <DashboardHeader title="Dashboard" greeting={greeting} dateLabel={dateLabel} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          href="/admin/absences"
          icon={CalendarClock}
          tone="indigo"
          title="Richieste di assenza"
          subtitle="In attesa"
          value={pendingAbsencesCount}
        >
          {pendingAbsenceItems.length > 0 && (
            <ul className="space-y-1.5">
              {pendingAbsenceItems.map((a) => (
                <KpiPreviewRow key={a.id} tone="indigo">
                  {a.employee.firstName} {a.employee.lastName} —{" "}
                  {ABSENCE_TYPE_LABELS_IT[a.type] ?? a.type} ·{" "}
                  {formatDateRangeIT(a.startDate, a.endDate)}
                </KpiPreviewRow>
              ))}
              {pendingAbsencesCount > pendingAbsenceItems.length && (
                <KpiPreviewMore>
                  +{pendingAbsencesCount - pendingAbsenceItems.length} altre richieste
                </KpiPreviewMore>
              )}
            </ul>
          )}
        </KpiCard>

        <KpiCard
          href="/admin/planning"
          icon={ClipboardList}
          tone="blue"
          title="Attività da assegnare"
          subtitle="Questa settimana"
          value={unassignedCount}
        >
          {unassignedItems.length > 0 && (
            <ul className="space-y-1.5">
              {unassignedItems.map((a) => (
                <KpiPreviewRow key={a.id} tone="blue">
                  {a.service.name} — {a.service.customer.name} · {formatShortDateIT(a.date)}
                </KpiPreviewRow>
              ))}
              {unassignedCount > unassignedItems.length && (
                <KpiPreviewMore>
                  +{unassignedCount - unassignedItems.length} altre attività
                </KpiPreviewMore>
              )}
            </ul>
          )}
        </KpiCard>

        <KpiCard
          href="/admin/planning"
          icon={CheckCircle2}
          tone="green"
          title="Attività da confermare"
          subtitle="Questa settimana"
          value={pendingConfirmationsCount}
        >
          {pendingConfirmationItems.length > 0 ? (
            <ul className="space-y-1.5">
              {pendingConfirmationItems.map((a) => (
                <KpiPreviewRow key={a.id} tone="green">
                  {a.service.name} — {a.service.customer.name} ({a.employee?.firstName}{" "}
                  {a.employee?.lastName}) · {formatShortDateIT(a.date)}
                </KpiPreviewRow>
              ))}
              {pendingConfirmationsCount > pendingConfirmationItems.length && (
                <KpiPreviewMore>
                  +{pendingConfirmationsCount - pendingConfirmationItems.length} altre attività
                </KpiPreviewMore>
              )}
            </ul>
          ) : (
            <KpiEmptyState
              title="Tutto confermato"
              description="Nessuna attività da confermare questa settimana."
            />
          )}
        </KpiCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeekOverviewCard days={overviewDays} planningHref="/admin/planning" />
        </div>

        {currentUser && (
          <AccountCard
            name={
              currentUser.firstName
                ? `${currentUser.firstName} ${currentUser.lastName ?? ""}`.trim()
                : "Nome non impostato"
            }
            initials={initials}
            email={currentUser.email}
            roleLabel={ROLE_LABEL}
            mustChangePassword={currentUser.mustChangePassword}
            editSlot={
              <AdminProfileForm
                admin={profileFormAdmin!}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    Modifica profilo
                  </Button>
                }
              />
            }
          />
        )}
      </div>
    </div>
  );
}
