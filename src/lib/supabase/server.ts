import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session via Next.js cookies, so every query
 * runs under the signed-in user's session and is subject to RLS.
 *
 * Never use the service-role key here -- this client is intentionally scoped
 * to the requesting user, which is what makes Server Actions safe to expose.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies. Safe to
            // ignore as long as middleware.ts is refreshing the session on
            // every request (it is -- see src/middleware.ts).
          }
        },
      },
    },
  );
}
