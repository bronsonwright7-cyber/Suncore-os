"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jobSchema, type JobInput } from "@/server/jobs/schema";
import type { JobPriority, JobSource, JobStatus } from "@/types/database";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseForm(formData: FormData) {
  return jobSchema.safeParse({
    property_id: formData.get("property_id") ?? "",
    solar_system_id: formData.get("solar_system_id") ?? "",
    job_type_id: formData.get("job_type_id") ?? "",
    priority: formData.get("priority") || "NORMAL",
    source: formData.get("source") ?? "",
    partner_id: formData.get("partner_id") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    appointment_date: formData.get("appointment_date") ?? "",
    appointment_start_time: formData.get("appointment_start_time") ?? "",
    appointment_end_time: formData.get("appointment_end_time") ?? "",
    appointment_window: formData.get("appointment_window") ?? "",
    assigned_crew_id: formData.get("assigned_crew_id") ?? "",
    assigned_employee_id: formData.get("assigned_employee_id") ?? "",
    scheduling_notes: formData.get("scheduling_notes") ?? "",
  });
}

function toRow(data: JobInput) {
  return {
    property_id: data.property_id,
    solar_system_id: data.solar_system_id ?? null,
    job_type_id: data.job_type_id ?? null,
    priority: data.priority as JobPriority,
    source: (data.source || null) as JobSource | null,
    partner_id: data.partner_id ?? null,
    title: data.title,
    description: data.description,
    appointment_date: data.appointment_date,
    appointment_start_time: data.appointment_start_time,
    appointment_end_time: data.appointment_end_time,
    appointment_window: data.appointment_window,
    assigned_crew_id: data.assigned_crew_id ?? null,
    assigned_employee_id: data.assigned_employee_id ?? null,
    scheduling_notes: data.scheduling_notes,
  };
}

/** Pure insert -- see insertCustomer in src/server/customers/actions.ts for why. */
export async function insertJob(input: JobInput): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert(toRow(input))
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create job." };
  }

  return { id: data.id };
}

export async function createJob(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await insertJob(parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${result.id}`);
}

export async function updateJob(
  id: string,
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${id}`);
  redirect(`/dashboard/jobs/${id}`);
}

export interface TransitionState {
  error?: string;
  success?: number;
}

export async function transitionJobStatus(
  jobId: string,
  toStatus: JobStatus,
  reason: string | null,
): Promise<TransitionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_transition_job_status", {
    p_job_id: jobId,
    p_to_status: toStatus,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { success: Date.now() };
}
