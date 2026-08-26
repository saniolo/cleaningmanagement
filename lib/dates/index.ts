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

// Prisma represents @db.Date/@db.Time columns as JS Date objects, but reads
// and writes them using UTC methods internally — using local getHours()/
// setDate() etc. on them would silently shift by the server process's TZ.
// These are the ONLY functions in the app allowed to construct or read
// these values; everything else should go through them.

export function timeStringToTimeValue(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

export function timeValueToTimeString(value: Date): string {
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function addMinutesToTimeValue(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

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
