import { z } from "zod";

export const recurringScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number({ invalid_type_error: "Giorno non valido." }).int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido."),
    estimatedDurationMinutes: z.coerce
      .number({ invalid_type_error: "Durata non valida." })
      .int("La durata deve essere un numero intero di minuti.")
      .positive("La durata deve essere maggiore di zero."),
    effectiveFrom: z.string().min(1, "La data di inizio è obbligatoria."),
    effectiveUntil: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((data) => !data.effectiveUntil || data.effectiveUntil >= data.effectiveFrom, {
    message: "La data di fine deve essere successiva o uguale alla data di inizio.",
    path: ["effectiveUntil"],
  });

export type RecurringScheduleInput = z.infer<typeof recurringScheduleSchema>;
