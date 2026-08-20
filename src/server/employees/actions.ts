"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchEmployeesForPicker } from "@/server/employees/queries";
import type { ComboboxOption } from "@/components/forms/combobox";
import type { EmployeeType } from "@/types/database";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const employeeSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(200),
  last_name: z.string().trim().min(1, "Last name is required").max(200),
  phone: z.string().trim().max(50),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  job_title: z.string().trim().max(200),
  employee_type: z.enum(["EMPLOYEE", "CONTRACTOR", "SUBCONTRACTOR"]),
});

function parseForm(formData: FormData) {
  return employeeSchema.safeParse({
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    job_title: formData.get("job_title") ?? "",
    employee_type: formData.get("employee_type") || "EMPLOYEE",
  });
}

export async function createEmployee(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      job_title: parsed.data.job_title || null,
      employee_type: parsed.data.employee_type as EmployeeType,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create employee." };
  }

  revalidatePath("/dashboard/employees");
  redirect(`/dashboard/employees/${data.id}`);
}

export async function updateEmployee(
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
    .from("employees")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      job_title: parsed.data.job_title || null,
      employee_type: parsed.data.employee_type as EmployeeType,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${id}`);
  redirect(`/dashboard/employees/${id}`);
}

export async function setEmployeeActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${id}`);
  return {};
}

export async function searchEmployeesAction(query: string): Promise<ComboboxOption[]> {
  const employees = await searchEmployeesForPicker(query);
  return employees.map((employee) => ({
    value: employee.id,
    label: `${employee.first_name} ${employee.last_name}`,
    description: employee.job_title ?? undefined,
  }));
}
