import { z } from "zod";

// Customer represents both the contractual customer and the single
// physical address being cleaned (merged from what used to be two
// separate Customer/Location models — see PROJECT_SPEC.md).
export const customerSchema = z.object({
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

export type CustomerInput = z.infer<typeof customerSchema>;

// "Nuovo cliente" also lets the admin pick services from the
// activity-template catalog to create in the same step, each with its own
// optional weekly cadence — same day/time shape as serviceScheduleSchema
// (see lib/validation/service.ts), just one per selected template instead
// of a single service's own schedule.
export const newCustomerActivitySchema = z.object({
  activityTemplateId: z.string(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
});

export type NewCustomerActivityInput = z.infer<typeof newCustomerActivitySchema>;

export const newCustomerSchema = customerSchema.extend({
  activities: z.array(newCustomerActivitySchema).default([]),
});

export type NewCustomerInput = z.infer<typeof newCustomerSchema>;
