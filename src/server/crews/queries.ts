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

const SORTABLE_COLUMNS = ["name", "created_at"] as const;

export async function listCrews(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, { column: "name", direction: "asc" });
  const q = getParam(searchParams, "q");
  const status = getParam(searchParams, "status") ?? "active";

  let query = supabase.from("crews").select("*", { count: "exact" });

  if (q) {
    query = query.ilike("name", `%${escapeOrFilterValue(q)}%`);
  }

  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize, sort, q, status };
}

export async function getCrew(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("crews").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listCrewMembers(crewId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crew_members")
    .select("*, employee:employees(id, first_name, last_name, job_title)")
    .eq("crew_id", crewId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchCrewsForPicker(q: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("crews")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(20);

  if (q) {
    query = query.ilike("name", `%${escapeOrFilterValue(q)}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
