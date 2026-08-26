import { z } from "zod";

/**
 * Kept out of actions.ts deliberately -- see src/server/customers/schema.ts
 * for why a "use server" file can't export this.
 */

const numericField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || !Number.isNaN(Number(value)), "Must be a number")
  .transform((value) => (value === null ? null : Number(value)));

const intField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || Number.isInteger(Number(value)), "Must be a whole number")
  .transform((value) => (value === null ? null : Number(value)));

const dateField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const solarSystemSchema = z.object({
  property_id: z.string().uuid("Select a property"),
  system_size_kw: numericField,
  panel_count: intField,
  panel_manufacturer: z.string().trim().max(200),
  panel_model: z.string().trim().max(200),
  inverter_manufacturer: z.string().trim().max(200),
  inverter_model: z.string().trim().max(200),
  install_date: dateField,
  monitoring_platform: z.string().trim().max(200),
  monitoring_system_id: z.string().trim().max(200),
  notes: z.string().trim().max(5000),
});

export type SolarSystemInput = z.infer<typeof solarSystemSchema>;
