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
