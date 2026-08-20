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

export async function listPartners(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, { column: "name", direction: "asc" });
  const q = getParam(searchParams, "q");
  const status = getParam(searchParams, "status") ?? "active";

  let query = supabase.from("partners").select("*", { count: "exact" });

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(
      `name.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%`,
    );
  }

  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize, sort, q, status };
}

export async function getPartner(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listActivePartnersForSelect() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchPartnersForPicker(q: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("partners")
    .select("id, name, partner_type")
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
