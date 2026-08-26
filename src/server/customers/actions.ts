"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchCustomersForPicker } from "@/server/customers/queries";
import { customerSchema, type CustomerInput } from "@/server/customers/schema";
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

  const result = await insertCustomer(parsed.data);
  if ("error" in result) {
    return { error: result.error };
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  redirect(`/dashboard/customers/${id}`);
}
