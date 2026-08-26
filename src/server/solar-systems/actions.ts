"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchSolarSystemsForPicker } from "@/server/solar-systems/queries";
import type { ComboboxOption } from "@/components/forms/combobox";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function searchSolarSystemsAction(
  propertyId: string | undefined,
  query: string,
): Promise<ComboboxOption[]> {
  const systems = await searchSolarSystemsForPicker(propertyId);
  const term = query.trim().toLowerCase();
  return systems
    .filter((system) => !term || (system.panel_manufacturer ?? "").toLowerCase().includes(term))
    .map((system) => ({
      value: system.id,
      label: system.system_size_kw ? `${system.system_size_kw} kW` : "Solar system",
      description: [
        system.panel_manufacturer,
        system.install_date ? `installed ${system.install_date}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

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

function parseForm(formData: FormData) {
  return solarSystemSchema.safeParse({
    property_id: formData.get("property_id") ?? "",
    system_size_kw: formData.get("system_size_kw") ?? "",
    panel_count: formData.get("panel_count") ?? "",
    panel_manufacturer: formData.get("panel_manufacturer") ?? "",
    panel_model: formData.get("panel_model") ?? "",
    inverter_manufacturer: formData.get("inverter_manufacturer") ?? "",
    inverter_model: formData.get("inverter_model") ?? "",
    install_date: formData.get("install_date") ?? "",
    monitoring_platform: formData.get("monitoring_platform") ?? "",
    monitoring_system_id: formData.get("monitoring_system_id") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export type SolarSystemInput = z.infer<typeof solarSystemSchema>;

function toRow(data: SolarSystemInput) {
  return {
    property_id: data.property_id,
    system_size_kw: data.system_size_kw,
    panel_count: data.panel_count,
    panel_manufacturer: data.panel_manufacturer || null,
    panel_model: data.panel_model || null,
    inverter_manufacturer: data.inverter_manufacturer || null,
    inverter_model: data.inverter_model || null,
    install_date: data.install_date,
    monitoring_platform: data.monitoring_platform || null,
    monitoring_system_id: data.monitoring_system_id || null,
    notes: data.notes || null,
  };
}

/** Pure insert -- see insertCustomer in src/server/customers/actions.ts for why. */
export async function insertSolarSystem(
  input: SolarSystemInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solar_systems")
    .insert(toRow(input))
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create solar system." };
  }

  return { id: data.id };
}

export async function createSolarSystem(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await insertSolarSystem(parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/solar-systems");
  revalidatePath(`/dashboard/properties/${parsed.data.property_id}`);
  redirect(`/dashboard/solar-systems/${result.id}`);
}

export async function updateSolarSystem(
  id: string,
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("solar_systems").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/solar-systems");
  revalidatePath(`/dashboard/solar-systems/${id}`);
  redirect(`/dashboard/solar-systems/${id}`);
}
