import { z } from "zod";

export const ABSENCE_TYPE_LABELS_IT: Record<string, string> = {
  VACATION: "Ferie",
  PERMISSION: "Permesso",
  SICKNESS: "Malattia",
};

export const ABSENCE_STATUS_LABELS_IT: Record<string, string> = {
  PENDING: "In attesa",
  APPROVED: "Approvata",
  REJECTED: "Rifiutata",
};

export const absenceRequestSchema = z
  .object({
    type: z.enum(["VACATION", "PERMISSION", "SICKNESS"], {
      errorMap: () => ({ message: "Seleziona un tipo di assenza." }),
    }),
    startDate: z.string().min(1, "La data di inizio è obbligatoria."),
    endDate: z.string().min(1, "La data di fine è obbligatoria."),
    notes: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La data di fine deve essere successiva o uguale alla data di inizio.",
    path: ["endDate"],
  });

export type AbsenceRequestInput = z.infer<typeof absenceRequestSchema>;
