import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio."),
  addressLine: z.string().trim().min(1, "L'indirizzo è obbligatorio."),
  city: z.string().trim().min(1, "La città è obbligatoria."),
  postalCode: z.string().trim().min(1, "Il CAP è obbligatorio."),
  province: z.string().trim().min(1, "La provincia è obbligatoria."),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type LocationInput = z.infer<typeof locationSchema>;
