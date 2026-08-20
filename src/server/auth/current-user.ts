import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user plus their app profile (role, name). Returns null if
 * there is no session -- callers in protected routes shouldn't normally hit
 * that, since middleware already redirects, but the check is kept here too
 * defense-in-depth.
 */
export async function getCurrentUserWithProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  return { user, profile };
}
