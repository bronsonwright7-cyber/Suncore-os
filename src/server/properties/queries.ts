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

const SORTABLE_COLUMNS = ["address_line1", "city", "created_at"] as const;

export async function listProperties(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, {
    column: "address_line1",
    direction: "asc",
  });
  const q = getParam(searchParams, "q");

  let query = supabase
    .from("properties")
    .select("*, customer:customers(id, first_name, last_name)", { count: "exact" });

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(
      `address_line1.ilike.%${term}%,city.ilike.%${term}%,postal_code.ilike.%${term}%`,
    );
  }

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize, sort, q };
}

export async function getProperty(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, customer:customers(id, first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listPropertySolarSystems(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("solar_systems")
    .select("*")
    .eq("property_id", propertyId)
    .order("install_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchPropertiesForPicker(q: string | undefined, customerId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("id, address_line1, city, state, customer:customers(first_name, last_name)")
    .order("address_line1", { ascending: true })
    .limit(20);

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(`address_line1.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
