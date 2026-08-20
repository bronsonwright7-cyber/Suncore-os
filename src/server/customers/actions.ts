"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchCustomersForPicker } from "@/server/customers/queries";
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

const customerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(200),
  last_name: z.string().trim().min(1, "Last name is required").max(200),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  phone: z.string().trim().max(50),
  notes: z.string().trim().max(5000),
});

function parseForm(formData: FormData) {
  return customerSchema.safeParse({
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createCustomer(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create customer." };
  }

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${data.id}`);
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
