import { z } from "zod";

/**
 * Kept out of actions.ts deliberately: a "use server" file may only export
 * async functions (Next.js rejects any other export -- "A 'use server' file
 * can only export async functions, found object" -- at build/runtime for
 * any file marked "use server", regardless of who imports it). customerSchema
 * is a plain Zod object, so it lives here instead and actions.ts imports it.
 */
export const customerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(200),
  last_name: z.string().trim().min(1, "Last name is required").max(200),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  phone: z.string().trim().max(50),
  notes: z.string().trim().max(5000),
});

export type CustomerInput = z.infer<typeof customerSchema>;
