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

export async function listCustomers(searchParams: RawSearchParams) {
  const supabase = await createClient();
  const page = getPage(searchParams);
  const pageSize = getPageSize(searchParams);
  const [from, to] = getRange(page, pageSize);
  const sort = getSort(searchParams, SORTABLE_COLUMNS, { column: "last_name", direction: "asc" });
  const q = getParam(searchParams, "q");

  let query = supabase.from("customers").select("*", { count: "exact" });

  if (q) {
    const term = escapeOrFilterValue(q);
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: data ?? [], count: count ?? 0, page, pageSize, sort, q };
}

export async function getCustomer(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listCustomerProperties(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("customer_id", customerId)
    .order("address_line1", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** For selects/comboboxes (job/property creation forms). */
export async function searchCustomersForPicker(q: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, first_name, last_name, email")
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
