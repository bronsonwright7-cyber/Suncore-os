"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchPartnersForPicker } from "@/server/partners/queries";
import type { ComboboxOption } from "@/components/forms/combobox";
import type { PartnerType } from "@/types/database";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const partnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  partner_type: z.enum(["roofing_partner", "solar_company", "other"]),
  contact_name: z.string().trim().max(200),
  contact_phone: z.string().trim().max(50),
  contact_email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  notes: z.string().trim().max(5000),
});

function parseForm(formData: FormData) {
  return partnerSchema.safeParse({
    name: formData.get("name") ?? "",
    partner_type: formData.get("partner_type") || "other",
    contact_name: formData.get("contact_name") ?? "",
    contact_phone: formData.get("contact_phone") ?? "",
    contact_email: formData.get("contact_email") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

function toRow(data: z.infer<typeof partnerSchema>) {
  return {
    name: data.name,
    partner_type: data.partner_type as PartnerType,
    contact_name: data.contact_name || null,
    contact_phone: data.contact_phone || null,
    contact_email: data.contact_email || null,
    notes: data.notes || null,
  };
}

export async function createPartner(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create partner." };
  }

  revalidatePath("/dashboard/partners");
  redirect(`/dashboard/partners/${data.id}`);
}

export async function updatePartner(
  id: string,
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("partners").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/partners");
  revalidatePath(`/dashboard/partners/${id}`);
  redirect(`/dashboard/partners/${id}`);
}

export async function setPartnerActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("partners").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/partners");
  revalidatePath(`/dashboard/partners/${id}`);
  return {};
}

export async function searchPartnersAction(query: string): Promise<ComboboxOption[]> {
  const partners = await searchPartnersForPicker(query);
  return partners.map((partner) => ({
    value: partner.id,
    label: partner.name,
    description: partner.partner_type,
  }));
}
