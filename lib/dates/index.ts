// Centralized timezone/date handling for the whole app — see PROJECT_SPEC.md
// section 4 ("Time handling") and the approved plan's timezone decision.
//
// Assignment/schedule dates and times are stored as wall-clock values
// (Postgres DATE/TIME, no timezone) because the business currently operates
// in a single timezone. This constant is the single place that fact is
// recorded; business logic and formatting should import it rather than
// hardcoding "Europe/Rome" elsewhere.

export const TIMEZONE = "Europe/Rome";

export const DAY_OF_WEEK_LABELS_IT = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

export const DAY_OF_WEEK_SHORT_LABELS_IT = [
  "Dom",
  "Lun",
  "Mar",
  "Mer",
  "Gio",
  "Ven",
  "Sab",
] as const;

export const MONTH_LABELS_IT = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

// Prisma represents @db.Date columns as JS Date objects, but reads and
// writes them using UTC methods internally — using local getHours()/
// setDate() etc. on them would silently shift by the server process's TZ.
// These are the ONLY functions in the app allowed to construct or read
// these values; everything else should go through them.

export function dateStringToDateValue(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateValueToDateString(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function addDaysToDateValue(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Monday of the ISO week containing `value` (Italian weeks start on Monday,
// but RecurringSchedule.dayOfWeek/Assignment.date follow JS's Sunday=0
// convention internally — this is the one place that reconciles the two).
export function getMondayOfWeek(value: Date): Date {
  const day = startOfUtcDay(value).getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysToDateValue(value, diffToMonday);
}

export function formatShortDateIT(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function formatLongDateIT(value: Date): string {
  return `${value.getUTCDate()} ${MONTH_LABELS_IT[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

// "Lunedì 31 agosto 2026" — for places where knowing the day of week matters
// at a glance (e.g. an employee deciding whether to accept an activity),
// not just the bare date formatLongDateIT gives.
export function formatLongDateWithWeekdayIT(value: Date): string {
  return `${DAY_OF_WEEK_LABELS_IT[value.getUTCDay()]} ${formatLongDateIT(value)}`;
}

// Collapses a single-day range ("27 agosto 2026 – 27 agosto 2026") down to
// one date, since that duplication reads as a mistake rather than a
// one-day absence.
export function formatDateRangeIT(start: Date, end: Date): string {
  if (dateValueToDateString(start) === dateValueToDateString(end)) {
    return formatLongDateIT(start);
  }
  return `${formatLongDateIT(start)} – ${formatLongDateIT(end)}`;
}

// ---------------------------------------------------------------------------
// Month strings ("YYYY-MM") — used by the monthly hours report. Kept as bare
// year-month strings with no timezone, expanded to a UTC date range only at
// the query boundary (monthStringToRange), same discipline as the date
// helpers above.
// ---------------------------------------------------------------------------

export const MONTH_STRING_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonthString(reference: Date = new Date()): string {
  return `${reference.getUTCFullYear()}-${String(reference.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthString(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  return currentMonthString(new Date(Date.UTC(year, m - 1 + delta, 1)));
}

// Inclusive [start, end] covering the whole month, as @db.Date-compatible
// UTC-midnight values (end = last day of the month).
export function monthStringToRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 0)),
  };
}

export function formatMonthLabelIT(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTH_LABELS_IT[m - 1]} ${year}`;
}
