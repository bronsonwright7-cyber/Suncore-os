"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchCrewsForPicker } from "@/server/crews/queries";
import type { ComboboxOption } from "@/components/forms/combobox";
import type { CrewRole } from "@/types/database";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const crewSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  notes: z.string().trim().max(5000),
});

function parseForm(formData: FormData) {
  return crewSchema.safeParse({
    name: formData.get("name") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createCrew(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crews")
    .insert({ name: parsed.data.name, notes: parsed.data.notes || null })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create crew." };
  }

  revalidatePath("/dashboard/crews");
  redirect(`/dashboard/crews/${data.id}`);
}

export async function updateCrew(
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
    .from("crews")
    .update({ name: parsed.data.name, notes: parsed.data.notes || null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/crews");
  revalidatePath(`/dashboard/crews/${id}`);
  redirect(`/dashboard/crews/${id}`);
}

export async function setCrewActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("crews").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/crews");
  revalidatePath(`/dashboard/crews/${id}`);
  return {};
}

export async function searchCrewsAction(query: string): Promise<ComboboxOption[]> {
  const crews = await searchCrewsForPicker(query);
  return crews.map((crew) => ({ value: crew.id, label: crew.name }));
}

const addMemberSchema = z.object({
  employee_id: z.string().uuid("Select an employee"),
  role_in_crew: z.enum(["LEAD", "MEMBER"]),
  start_date: z.string().trim().min(1, "Start date is required"),
});

export interface AddMemberState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: number;
}

export async function addCrewMember(
  crewId: string,
  _prevState: AddMemberState | undefined,
  formData: FormData,
): Promise<AddMemberState> {
  const parsed = addMemberSchema.safeParse({
    employee_id: formData.get("employee_id") ?? "",
    role_in_crew: formData.get("role_in_crew") || "MEMBER",
    start_date: formData.get("start_date") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crew_members").insert({
    crew_id: crewId,
    employee_id: parsed.data.employee_id,
    role_in_crew: parsed.data.role_in_crew as CrewRole,
    start_date: parsed.data.start_date,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That employee is already an active member of this crew."
          : error.message,
    };
  }

  revalidatePath(`/dashboard/crews/${crewId}`);
  revalidatePath(`/dashboard/employees`);
  return { success: Date.now() };
}

export async function endCrewMembership(
  membershipId: string,
  crewId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crew_members")
    .update({ end_date: new Date().toISOString().slice(0, 10) })
    .eq("id", membershipId)
    .is("end_date", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/crews/${crewId}`);
  revalidatePath(`/dashboard/employees`);
  return {};
}
