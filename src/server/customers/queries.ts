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

/** Primary first, then oldest first -- see 0018_customer_phone_numbers.sql. */
export async function listCustomerPhoneNumbers(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_phone_numbers")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
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

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface DuplicateCustomerCandidate {
  firstName: string | null;
  lastName: string | null;
  phones: string[];
  emails: string[];
}

export interface DuplicateCustomerMatch {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  matchReasons: Array<"name" | "phone" | "email">;
}

interface DuplicateCandidateCustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

/** name/email match, or a match against customers.phone (the synced primary number). */
async function findCustomersByNameOrPrimaryPhone(
  orParts: string[],
): Promise<DuplicateCandidateCustomerRow[]> {
  if (orParts.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone")
    .or(orParts.join(","))
    .limit(10);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Matches against customer_phone_numbers directly -- catches a candidate
 * phone that's on file as a customer's secondary (non-primary) number,
 * which customers.phone alone (only ever the synced primary) can't surface.
 */
async function findCustomersByOtherPhoneNumbers(
  orParts: string[],
): Promise<{ phone_number: string; customer: DuplicateCandidateCustomerRow | null }[]> {
  if (orParts.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_phone_numbers")
    .select("phone_number, customer:customers(id, first_name, last_name, email, phone)")
    .or(orParts.join(","))
    .limit(10);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * AI Intake's V1 duplicate check (see PHASE C requirements), extended for
 * Phase 1 of multi-phone support to also match a candidate phone against a
 * customer's secondary numbers (supabase/migrations/0018_customer_phone_numbers.sql),
 * not just their primary. Reuses the same cookie-scoped client and
 * ilike-escaping as searchCustomersForPicker above, then confirms + labels
 * each candidate row in JS against normalized name/phone/email -- no
 * pg_trgm, no new migration beyond 0018.
 */
export async function findPossibleDuplicateCustomers(
  candidate: DuplicateCustomerCandidate,
): Promise<DuplicateCustomerMatch[]> {
  const orParts: string[] = [];
  const phoneOnlyOrParts: string[] = [];

  if (candidate.firstName?.trim() && candidate.lastName?.trim()) {
    orParts.push(
      `and(first_name.ilike.${escapeOrFilterValue(candidate.firstName.trim())},last_name.ilike.${escapeOrFilterValue(
        candidate.lastName.trim(),
      )})`,
    );
  }
  for (const email of candidate.emails) {
    if (email.trim()) orParts.push(`email.ilike.${escapeOrFilterValue(email.trim())}`);
  }
  for (const phone of candidate.phones) {
    const digits = normalizePhone(phone);
    if (digits.length >= 7) {
      orParts.push(`phone.ilike.%${escapeOrFilterValue(digits.slice(-7))}%`);
      phoneOnlyOrParts.push(`phone_number.ilike.%${escapeOrFilterValue(digits.slice(-7))}%`);
    }
  }

  const [customerRows, phoneNumberRows] = await Promise.all([
    findCustomersByNameOrPrimaryPhone(orParts),
    findCustomersByOtherPhoneNumbers(phoneOnlyOrParts),
  ]);

  if (customerRows.length === 0 && phoneNumberRows.length === 0) return [];

  const normalizedEmails = new Set(candidate.emails.map(normalizeEmail));
  const normalizedPhones = new Set(candidate.phones.map(normalizePhone));
  const normalizedFullName =
    candidate.firstName?.trim() && candidate.lastName?.trim()
      ? normalizeName(`${candidate.firstName} ${candidate.lastName}`)
      : null;

  const candidatesById = new Map<string, DuplicateCandidateCustomerRow>();
  const extraPhonesByCustomerId = new Map<string, string[]>();

  for (const row of customerRows) {
    candidatesById.set(row.id, row);
  }
  for (const row of phoneNumberRows) {
    if (!row.customer) continue;
    if (!candidatesById.has(row.customer.id)) {
      candidatesById.set(row.customer.id, row.customer);
    }
    const list = extraPhonesByCustomerId.get(row.customer.id) ?? [];
    list.push(row.phone_number);
    extraPhonesByCustomerId.set(row.customer.id, list);
  }

  return Array.from(candidatesById.values())
    .map((row): DuplicateCustomerMatch => {
      const matchReasons: Array<"name" | "phone" | "email"> = [];
      if (row.email && normalizedEmails.has(normalizeEmail(row.email))) {
        matchReasons.push("email");
      }
      const allPhonesOnFile = [row.phone, ...(extraPhonesByCustomerId.get(row.id) ?? [])].filter(
        (p): p is string => !!p,
      );
      if (allPhonesOnFile.some((p) => normalizedPhones.has(normalizePhone(p)))) {
        matchReasons.push("phone");
      }
      if (normalizedFullName && normalizeName(`${row.first_name} ${row.last_name}`) === normalizedFullName) {
        matchReasons.push("name");
      }
      return { ...row, matchReasons };
    })
    .filter((row) => row.matchReasons.length > 0)
    .slice(0, 10);
}
