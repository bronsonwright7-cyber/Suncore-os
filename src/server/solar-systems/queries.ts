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

const SORTABLE_COLUMNS = ["install_date", "system_size_kw", "created_at"] as const;

export async function listSolarSystems(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, {
    column: "created_at",
    direction: "desc",
  });
  const q = getParam(searchParams, "q");

  let query = supabase
    .from("solar_systems")
    .select(
      "*, property:properties(id, address_line1, city, state, customer:customers(id, first_name, last_name))",
      { count: "exact" },
    );

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(
      `panel_manufacturer.ilike.%${term}%,inverter_manufacturer.ilike.%${term}%,monitoring_system_id.ilike.%${term}%`,
    );
  }

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize, sort, q };
}

export async function searchSolarSystemsForPicker(propertyId: string | undefined) {
  if (!propertyId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solar_systems")
    .select("id, system_size_kw, panel_manufacturer, install_date")
    .eq("property_id", propertyId)
    .order("install_date", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSolarSystem(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solar_systems")
    .select(
      "*, property:properties(id, address_line1, city, state, customer:customers(id, first_name, last_name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
