import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { addMinutesToTimeValue } from "@/lib/dates";

// Default rolling planning horizon: how far into the future dated
// Assignments get generated from active RecurringSchedules. Keeping this a
// single constant (rather than generating indefinitely) is the "rolling
// horizon" strategy documented in the approved plan / PROJECT_SPEC.md
// section 10 ("do not create infinite future records").
export const DEFAULT_HORIZON_WEEKS = 8;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addUtcWeeks(date: Date, weeks: number): Date {
  return addUtcDays(date, weeks * 7);
}

// Every date in [start, end] (inclusive) that falls on dayOfWeek
// (0 = Sunday .. 6 = Saturday, matching RecurringSchedule.dayOfWeek and
// JS Date#getUTCDay()).
function datesForDayOfWeek(dayOfWeek: number, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  if (start > end) return dates;

  let cursor = startOfUtcDay(start);
  const daysUntilMatch = (dayOfWeek - cursor.getUTCDay() + 7) % 7;
  cursor = addUtcDays(cursor, daysUntilMatch);

  while (cursor <= end) {
    dates.push(cursor);
    cursor = addUtcDays(cursor, 7);
  }

  return dates;
}

/**
 * Generates dated Assignments from every active RecurringSchedule of a
 * company, covering [today, today + horizonWeeks], respecting each
 * schedule's effectiveFrom/effectiveUntil bounds.
 *
 * Idempotent by construction: Assignment has a unique constraint on
 * (sourceRecurringScheduleId, date), and this uses createMany with
 * skipDuplicates, so calling this repeatedly (from a daily cron, or
 * on-demand) never creates duplicate rows for a schedule+date pair.
 * Deactivating a schedule stops it from generating new rows but does NOT
 * retroactively touch Assignments already generated from it — adjusting
 * those is manual assignment editing (Milestone 4 scope).
 */
export async function generateAssignmentsForWindow(
  companyId: string,
  horizonWeeks: number = DEFAULT_HORIZON_WEEKS
): Promise<{ created: number }> {
  const today = startOfUtcDay(new Date());
  const horizonEnd = addUtcWeeks(today, horizonWeeks);

  const schedules = await prisma.recurringSchedule.findMany({
    where: {
      companyId,
      active: true,
      effectiveFrom: { lte: horizonEnd },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: today } }],
    },
  });

  const rows: Prisma.AssignmentCreateManyInput[] = [];

  for (const schedule of schedules) {
    const rangeStart = schedule.effectiveFrom > today ? schedule.effectiveFrom : today;
    const rangeEnd =
      schedule.effectiveUntil && schedule.effectiveUntil < horizonEnd
        ? schedule.effectiveUntil
        : horizonEnd;

    for (const date of datesForDayOfWeek(schedule.dayOfWeek, rangeStart, rangeEnd)) {
      rows.push({
        companyId,
        serviceId: schedule.serviceId,
        date,
        startTime: schedule.startTime,
        endTime: addMinutesToTimeValue(schedule.startTime, schedule.estimatedDurationMinutes),
        sourceRecurringScheduleId: schedule.id,
      });
    }
  }

  if (rows.length === 0) return { created: 0 };

  const result = await prisma.assignment.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { created: result.count };
}
