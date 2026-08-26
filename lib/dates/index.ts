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
