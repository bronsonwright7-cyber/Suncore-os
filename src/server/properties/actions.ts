"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchPropertiesForPicker } from "@/server/properties/queries";
import { propertySchema, type PropertyInput } from "@/server/properties/schema";
import type { ComboboxOption } from "@/components/forms/combobox";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseForm(formData: FormData) {
  return propertySchema.safeParse({
    customer_id: formData.get("customer_id") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    postal_code: formData.get("postal_code") ?? "",
    country: formData.get("country") || "US",
    notes: formData.get("notes") ?? "",
  });
}

/** Pure insert -- see insertCustomer in src/server/customers/actions.ts for why. */
export async function insertProperty(
  input: PropertyInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      customer_id: input.customer_id,
      address_line1: input.address_line1,
      address_line2: input.address_line2 || null,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create property." };
  }

  return { id: data.id };
}

export async function createProperty(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await insertProperty(parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/customers/${parsed.data.customer_id}`);
  redirect(`/dashboard/properties/${result.id}`);
}

export async function updateProperty(
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
    .from("properties")
    .update({
      customer_id: parsed.data.customer_id,
      address_line1: parsed.data.address_line1,
      address_line2: parsed.data.address_line2 || null,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postal_code,
      country: parsed.data.country,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${id}`);
  redirect(`/dashboard/properties/${id}`);
}

export async function searchPropertiesAction(
  query: string,
  customerId?: string,
): Promise<ComboboxOption[]> {
  const properties = await searchPropertiesForPicker(query, customerId);
  return properties.map((property) => ({
    value: property.id,
    label: property.address_line1,
    description: `${property.city}, ${property.state}${
      property.customer ? ` · ${property.customer.first_name} ${property.customer.last_name}` : ""
    }`,
  }));
}
