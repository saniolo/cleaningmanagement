import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, "Il nome è obbligatorio."),
  lastName: z.string().trim().min(1, "Il cognome è obbligatorio."),
  phone: optionalTrimmed,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Email non valida.",
    }),
  notes: optionalTrimmed,
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
