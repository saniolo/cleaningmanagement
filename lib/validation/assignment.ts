import { z } from "zod";

const UNASSIGNED_VALUE = "__unassigned__";

const baseAssignmentFields = {
  date: z.string().min(1, "La data è obbligatoria."),
  durationMinutes: z.coerce
    .number({ invalid_type_error: "Durata non valida." })
    .int("La durata deve essere un numero intero di minuti.")
    .positive("La durata deve essere maggiore di zero."),
  employeeId: z
    .string()
    .optional()
    .transform((v) => (v && v !== UNASSIGNED_VALUE ? v : undefined)),
  requiresConfirmation: z.boolean().optional(),
};

export const assignmentSchema = z.object(baseAssignmentFields);

export const createAssignmentSchema = z.object({
  serviceId: z.string().min(1, "Il servizio è obbligatorio."),
  ...baseAssignmentFields,
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export { UNASSIGNED_VALUE };
