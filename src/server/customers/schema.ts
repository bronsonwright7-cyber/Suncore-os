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

/**
 * One row of a customer's phone number list (see
 * supabase/migrations/0018_customer_phone_numbers.sql). `is_primary` is
 * derived from the form's single primary-selection radio, not typed
 * per-row by the user -- see parsePhoneNumbersForm in actions.ts.
 */
export const phoneNumberSchema = z.object({
  phone_number: z.string().trim().min(1, "Phone number is required").max(50),
  phone_type: z.enum(["mobile", "home", "work", "other"]),
  is_primary: z.boolean(),
});

export type PhoneNumberInput = z.infer<typeof phoneNumberSchema>;

/**
 * The full list submitted for a customer: zero or more rows, and -- when
 * there's at least one -- exactly one of them must be primary. This is the
 * same invariant supabase/migrations/0018_customer_phone_numbers.sql's
 * triggers enforce at the database level; validating it here too lets the
 * form reject a bad submission before ever calling
 * fn_replace_customer_phone_numbers.
 */
export const customerPhoneNumbersSchema = z
  .array(phoneNumberSchema)
  .max(20)
  .refine(
    (phones) => phones.length === 0 || phones.filter((p) => p.is_primary).length === 1,
    "Exactly one phone number must be marked primary.",
  );
