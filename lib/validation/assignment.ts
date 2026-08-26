import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const UNASSIGNED_VALUE = "__unassigned__";

const baseAssignmentFields = {
  date: z.string().min(1, "La data è obbligatoria."),
  startTime: z.string().regex(TIME_REGEX, "Orario di inizio non valido."),
  endTime: z.string().regex(TIME_REGEX, "Orario di fine non valido."),
  employeeId: z
    .string()
    .optional()
    .transform((v) => (v && v !== UNASSIGNED_VALUE ? v : undefined)),
};

export const assignmentSchema = z
  .object(baseAssignmentFields)
  .refine((data) => data.endTime > data.startTime, {
    message: "L'orario di fine deve essere successivo a quello di inizio.",
    path: ["endTime"],
  });

export const createAssignmentSchema = z
  .object({
    serviceId: z.string().min(1, "Il servizio è obbligatorio."),
    ...baseAssignmentFields,
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "L'orario di fine deve essere successivo a quello di inizio.",
    path: ["endTime"],
  });

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export { UNASSIGNED_VALUE };
