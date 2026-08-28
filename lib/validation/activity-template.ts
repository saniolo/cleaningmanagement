import { z } from "zod";

export const activityTemplateSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio."),
  estimatedDurationMinutes: z.coerce
    .number({ invalid_type_error: "Durata non valida." })
    .int("La durata deve essere un numero intero di minuti.")
    .positive("La durata deve essere maggiore di zero."),
});

export type ActivityTemplateInput = z.infer<typeof activityTemplateSchema>;
