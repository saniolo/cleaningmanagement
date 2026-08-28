import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  estimatedDurationMinutes: z.coerce
    .number({ invalid_type_error: "Durata non valida." })
    .int("La durata deve essere un numero intero di minuti.")
    .positive("La durata deve essere maggiore di zero."),
  operationalNotes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

// Optional weekly cadence set up at the same time a service is created —
// "Pulizia scale ogni lunedì, mercoledì e venerdì" in one step instead of
// creating the service, then opening it and adding three separate
// ricorrenze by hand. Purely a bulk-creation convenience: each selected day
// becomes its own independent RecurringSchedule row (same as if added one
// at a time from the service's own page), so afterwards each day is
// managed individually there — this form never touches days after
// creation, only at the moment the service is first set up. No time of day
// is tracked — only which days it happens on; duration comes from the
// service's own estimatedDurationMinutes.
export const serviceScheduleSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
});

export type ServiceScheduleInput = z.infer<typeof serviceScheduleSchema>;
