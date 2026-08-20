import { createClient } from "@/lib/supabase/server";
import { escapeOrFilterValue } from "@/lib/postgrest";
import {
  getPage,
  getPageSize,
  getParam,
  getRange,
  getSort,
  type RawSearchParams,
} from "@/lib/search-params";

const SORTABLE_COLUMNS = ["last_name", "first_name", "created_at"] as const;

export async function listEmployees(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, { column: "last_name", direction: "asc" });
  const q = getParam(searchParams, "q");
  const status = getParam(searchParams, "status") ?? "active";

  let query = supabase.from("employees").select("*", { count: "exact" });

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,job_title.ilike.%${term}%`,
    );
  }

  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize, sort, q, status };
}

export async function getEmployee(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listEmployeeCrews(employeeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crew_members")
    .select("*, crew:crews(id, name)")
    .eq("employee_id", employeeId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchEmployeesForPicker(q: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("employees")
    .select("id, first_name, last_name, job_title")
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .limit(20);

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
