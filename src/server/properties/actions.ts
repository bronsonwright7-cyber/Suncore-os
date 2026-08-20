"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchPropertiesForPicker } from "@/server/properties/queries";
import type { ComboboxOption } from "@/components/forms/combobox";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const propertySchema = z.object({
  customer_id: z.string().uuid("Select a customer"),
  address_line1: z.string().trim().min(1, "Address is required").max(300),
  address_line2: z.string().trim().max(300),
  city: z.string().trim().min(1, "City is required").max(200),
  state: z.string().trim().min(1, "State is required").max(100),
  postal_code: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(100),
  notes: z.string().trim().max(5000),
});

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

export async function createProperty(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      customer_id: parsed.data.customer_id,
      address_line1: parsed.data.address_line1,
      address_line2: parsed.data.address_line2 || null,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postal_code,
      country: parsed.data.country,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create property." };
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/customers/${parsed.data.customer_id}`);
  redirect(`/dashboard/properties/${data.id}`);
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
