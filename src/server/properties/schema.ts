import { z } from "zod";

/**
 * Kept out of actions.ts deliberately -- see src/server/customers/schema.ts
 * for why a "use server" file can't export this.
 */
export const propertySchema = z.object({
  customer_id: z.string().uuid("Select a customer"),
  address_line1: z.string().trim().min(1, "Address is required").max(300),
  address_line2: z.string().trim().max(300),
  city: z.string().trim().min(1, "City is required").max(200),
  state: z.string().trim().min(1, "State is required").max(100),
  postal_code: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(100),
  notes: z.string().trim().max(5000),
});

export type PropertyInput = z.infer<typeof propertySchema>;
