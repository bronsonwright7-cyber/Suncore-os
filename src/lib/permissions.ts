import type { UserRole } from "@/types/database";

/**
 * UI-layer mirrors of the RLS role helper functions in
 * supabase/migrations/0009_rls_functions_and_policies.sql. These exist to
 * hide actions/nav items the database would reject anyway (better UX than a
 * failed request) -- they are NOT the security boundary. RLS is. Never rely
 * on these alone to protect data.
 */

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function isOfficeOrAdmin(role: UserRole | null | undefined): boolean {
  return isAdmin(role) || role === "OFFICE";
}

/** Owner/Admin/Office/QA -- matches fn_can_read_broadly() in RLS. */
export function canReadBroadly(role: UserRole | null | undefined): boolean {
  return isOfficeOrAdmin(role) || role === "QA";
}

/** Create/edit Customers, Properties, Solar Systems, Employees, Crews, Partners, Jobs. */
export function canManageCore(role: UserRole | null | undefined): boolean {
  return isOfficeOrAdmin(role);
}

/** Partners are not visible to QA or Crew -- matches the partners_* RLS policies. */
export function canViewPartners(role: UserRole | null | undefined): boolean {
  return isOfficeOrAdmin(role);
}

export function isCrew(role: UserRole | null | undefined): boolean {
  return role === "CREW_LEAD" || role === "CREW_MEMBER";
}
