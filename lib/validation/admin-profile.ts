import { z } from "zod";

// currentPassword is always required, even when only the name is changing
// — it's the one thing that confirms "this is really the account owner"
// for a form that can also change the login email/password themselves.
export const adminProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Il nome è obbligatorio."),
  lastName: z.string().trim().min(1, "Il cognome è obbligatorio."),
  email: z.string().trim().email("Inserisci un'email valida."),
  currentPassword: z.string().min(1, "Inserisci la password attuale per confermare le modifiche."),
  newPassword: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || v.length >= 8, {
      message: "La nuova password deve avere almeno 8 caratteri.",
    }),
});

export type AdminProfileInput = z.infer<typeof adminProfileSchema>;
