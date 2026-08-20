# Development

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase values -- see docs/ENVIRONMENT.md
npm run dev
```

## Before committing

```bash
npm run typecheck
npm run lint
npm run format
```

## Adding a database migration

1. Add a new numbered file to `supabase/migrations/` (e.g. `0013_something.sql`) -- never edit a
   committed migration that's already been applied anywhere.
2. Apply it (SQL Editor or `npx supabase db push` -- see `docs/DATABASE.md`).
3. Regenerate types: `npx supabase gen types typescript --linked > src/types/database.ts`.
4. If you added/changed a text+CHECK-constraint category column, update
   `src/lib/constants.ts` to match.
5. If you touched RLS, actually test it as more than one role before merging -- policy mistakes
   fail silently (a query just returns fewer rows than expected) rather than erroring.

## Conventions

- Server Components by default; add `"use client"` only where you need interactivity/hooks.
- Mutations go through Server Actions (`server/<feature>/actions.ts`), not client-side fetches to
  hand-rolled API routes.
- Query through the typed Supabase client (`src/lib/supabase/server.ts` /
  `src/lib/supabase/client.ts`) so `src/types/database.ts` catches drift from the schema.
- `jobs.status` changes only via the `fn_transition_job_status` RPC -- see `docs/DATABASE.md`.
- Crew-facing code should query `jobs_crew_view`, not `jobs` directly, to keep financial/internal
  fields out of that surface by construction.
- Don't add abstractions, config, or dependencies beyond what the current task needs.

## Known environment notes

- This project was scaffolded with **TypeScript pinned to 5.9.3** and **ESLint pinned to 9.39.5**,
  not the newest available majors (TypeScript 7 / ESLint 10 at the time), because
  `eslint-config-next`'s own lint plugin dependencies (`typescript-eslint`, `eslint-plugin-import`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-react`) don't yet support those newer majors without
  forced peer-dependency overrides. Revisit these pins once the Next.js lint toolchain catches up.
- `unrs-resolver`'s postinstall script is not auto-approved (`npm warn allow-scripts`) -- this is
  npm's default safety behavior for third-party postinstall scripts and was left as-is
  deliberately rather than approved automatically. It only affects import-resolution performance
  in ESLint, not correctness. Review and run `npm approve-scripts` yourself if you want it.
