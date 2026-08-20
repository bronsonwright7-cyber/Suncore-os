import { createClient } from "@/lib/supabase/server";
import { escapeOrFilterValue } from "@/lib/postgrest";
import type { JobPriority, JobSource, JobStatus } from "@/types/database";
import {
  getPage,
  getPageSize,
  getParam,
  getRange,
  getSort,
  type RawSearchParams,
} from "@/lib/search-params";

const SORTABLE_COLUMNS = [
  "appointment_date",
  "priority",
  "status",
  "created_at",
  "customer_last_name",
  "job_number",
] as const;

export async function listJobs(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, {
    column: "appointment_date",
    direction: "asc",
  });
  const q = getParam(searchParams, "q");
  const status = getParam(searchParams, "status") ?? "open";
  const priority = getParam(searchParams, "priority");
  const source = getParam(searchParams, "source");
  const assignedCrewId = getParam(searchParams, "crew");
  const jobTypeId = getParam(searchParams, "type");
  const dateFrom = getParam(searchParams, "from");
  const dateTo = getParam(searchParams, "to");

  let query = supabase.from("jobs_list_view").select("*", { count: "exact" });

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(
      `title.ilike.%${term}%,customer_first_name.ilike.%${term}%,customer_last_name.ilike.%${term}%,property_address_line1.ilike.%${term}%`,
    );
  }

  if (status === "open") {
    query = query.neq("status", "CLOSED");
  } else if (status !== "all") {
    query = query.eq("status", status as JobStatus);
  }

  if (priority && priority !== "all") query = query.eq("priority", priority as JobPriority);
  if (source && source !== "all") query = query.eq("source", source as JobSource);
  if (assignedCrewId && assignedCrewId !== "all")
    query = query.eq("assigned_crew_id", assignedCrewId);
  if (jobTypeId && jobTypeId !== "all") query = query.eq("job_type_id", jobTypeId);
  if (dateFrom) query = query.gte("appointment_date", dateFrom);
  if (dateTo) query = query.lte("appointment_date", dateTo);

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
    sort,
    q,
    status,
    priority,
    source,
    assignedCrewId,
    jobTypeId,
    dateFrom,
    dateTo,
  };
}

export async function listPropertyJobs(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs_list_view")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getJob(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `*,
      property:properties(id, address_line1, address_line2, city, state, postal_code, customer:customers(id, first_name, last_name, email, phone)),
      solar_system:solar_systems(id, system_size_kw, panel_manufacturer),
      job_type:job_types(id, code, label),
      partner:partners(id, name),
      assigned_crew:crews(id, name),
      assigned_employee:employees(id, first_name, last_name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listJobEvents(jobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_events")
    .select("*, actor:profiles(full_name)")
    .eq("job_id", jobId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAllowedNextStatuses(currentStatus: JobStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_status_transitions")
    .select("to_status")
    .eq("from_status", currentStatus);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.to_status);
}

export async function listActiveJobTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_types")
    .select("id, code, label")
    .eq("is_active", true)
    .order("label", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listActiveCrewsForFilter() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crews")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
