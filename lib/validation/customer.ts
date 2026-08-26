import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio."),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type CustomerInput = z.infer<typeof customerSchema>;
