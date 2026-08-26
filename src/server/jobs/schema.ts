import { z } from "zod";

/**
 * Kept out of actions.ts deliberately -- see src/server/customers/schema.ts
 * for why a "use server" file can't export this.
 */

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .refine((value) => value === undefined || z.uuid().safeParse(value).success, "Invalid selection");

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const jobSchema = z.object({
  property_id: z.uuid("Select a property"),
  solar_system_id: optionalUuid,
  job_type_id: optionalUuid,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  source: z.union([
    z.enum([
      "roofing_partner",
      "solar_company",
      "homeowner",
      "warranty",
      "referral",
      "internal",
      "other",
    ]),
    z.literal(""),
  ]),
  partner_id: optionalUuid,
  title: z.string().trim().min(1, "Title is required").max(300),
  description: optionalText,
  appointment_date: optionalText,
  appointment_start_time: optionalText,
  appointment_end_time: optionalText,
  appointment_window: optionalText,
  assigned_crew_id: optionalUuid,
  assigned_employee_id: optionalUuid,
  scheduling_notes: optionalText,
});

export type JobInput = z.infer<typeof jobSchema>;
