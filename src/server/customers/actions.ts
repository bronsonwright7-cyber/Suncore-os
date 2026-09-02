"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchCustomersForPicker } from "@/server/customers/queries";
import {
  customerSchema,
  customerPhoneNumbersSchema,
  type CustomerInput,
  type PhoneNumberInput,
} from "@/server/customers/schema";
import type { ComboboxOption } from "@/components/forms/combobox";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function searchCustomersAction(query: string): Promise<ComboboxOption[]> {
  const customers = await searchCustomersForPicker(query);
  return customers.map((customer) => ({
    value: customer.id,
    label: `${customer.first_name} ${customer.last_name}`,
    description: customer.email ?? undefined,
  }));
}

function parseForm(formData: FormData) {
  return customerSchema.safeParse({
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

/**
 * Parses the customer form's repeatable phone-number rows: parallel
 * same-name arrays (phone_number[]/phone_type[]) plus a single
 * primary_phone_index radio value identifying which row is primary -- see
 * src/components/customers/phone-number-fields.tsx. Rows left entirely
 * blank (an added-then-abandoned row) are dropped before validation rather
 * than surfaced as an error.
 */
function parsePhoneNumbersForm(formData: FormData) {
  const numbers = formData.getAll("phone_number[]").map(String);
  const types = formData.getAll("phone_type[]").map(String);
  const primaryIndex = Number(formData.get("primary_phone_index") ?? -1);

  const phones = numbers
    .map((phoneNumber, i) => ({
      phone_number: phoneNumber.trim(),
      phone_type: types[i] || "mobile",
      is_primary: i === primaryIndex,
    }))
    .filter((p) => p.phone_number !== "");

  return customerPhoneNumbersSchema.safeParse(phones);
}

/**
 * Pure replace: a customer's phone number list is always submitted as a
 * full set (not an incremental diff), so this atomically deletes the
 * customer's existing rows and inserts the new set in one transaction (see
 * fn_replace_customer_phone_numbers, supabase/migrations/0018_customer_phone_numbers.sql)
 * -- a partial failure can't leave a mixed old/new phone list. Called by
 * createCustomer/updateCustomer below, after the customer row itself is
 * written.
 */
export async function replaceCustomerPhoneNumbers(
  customerId: string,
  phones: PhoneNumberInput[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_replace_customer_phone_numbers", {
    p_customer_id: customerId,
    p_phones: phones,
  });

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

/**
 * Pure insert: validated input in, new row id (or an error) out. No
 * FormData parsing, no redirect/revalidate -- shared by the createCustomer
 * Server Action below and (in a later phase) AI intake's confirmed-record
 * creation, so both go through this exact same validated, RLS-scoped,
 * attribution-safe write path.
 */
export async function insertCustomer(
  input: CustomerInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create customer." };
  }

  return { id: data.id };
}

export async function createCustomer(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const parsedPhones = parsePhoneNumbersForm(formData);
  if (!parsedPhones.success) {
    return { error: parsedPhones.error.issues[0]?.message ?? "Phone numbers are invalid." };
  }

  const result = await insertCustomer(parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  const phonesResult = await replaceCustomerPhoneNumbers(result.id, parsedPhones.data);
  if ("error" in phonesResult) {
    return { error: phonesResult.error };
  }

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${result.id}`);
}

export async function updateCustomer(
  id: string,
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const parsedPhones = parsePhoneNumbersForm(formData);
  if (!parsedPhones.success) {
    return { error: parsedPhones.error.issues[0]?.message ?? "Phone numbers are invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email || null,
      // phone is intentionally NOT written here -- the form no longer
      // collects it directly, and it's kept in sync from the customer's
      // primary customer_phone_numbers row by fn_sync_customer_primary_phone
      // (see replaceCustomerPhoneNumbers below). Writing null here first
      // would only create a brief, pointless window where a customer's real
      // phone number transiently reads as empty before being corrected.
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const phonesResult = await replaceCustomerPhoneNumbers(id, parsedPhones.data);
  if ("error" in phonesResult) {
    return { error: phonesResult.error };
  }

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  redirect(`/dashboard/customers/${id}`);
}
