# Environment variables

Copy `.env.example` to `.env.local` for local development and fill in real values. `.env.local` is
git-ignored -- never commit it or any file with real credentials.

| Variable | Where to get it | Exposed to browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard -> Project Settings -> API -> Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page -> anon/public key | Yes -- safe by design; all access is still governed by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page -> service_role key | **No -- server-only** |
| `NEXT_PUBLIC_SITE_URL` | Your app's base URL (`http://localhost:3000` locally; the Vercel/custom domain in production) | Yes |

## The service-role key

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It is not currently used
anywhere in the codebase, and should stay that way for all normal request handling -- every
request must run under the signed-in user's own session (via `src/lib/supabase/server.ts`), which
is what makes RLS an actual security boundary rather than a formality.

If a genuine need for the service-role key comes up later (a scheduled job, a one-off admin
script), it belongs in an isolated, trusted server-side context only -- never imported into a
Client Component, never used to serve a normal user-facing request, and never given a
`NEXT_PUBLIC_` prefix (which would ship it to every visitor's browser).

## Vercel

Set the four variables above in the Vercel project's Environment Variables settings (Production,
Preview, and Development as appropriate). `NEXT_PUBLIC_SITE_URL` should point at the deployed URL
in Production/Preview, not `localhost`.

## Supabase Auth redirect URLs

Once deployed, add the production/preview URLs to Supabase's Auth -> URL Configuration (Site URL
and Redirect URLs), or sign-in/redirect flows will fail outside of localhost.
