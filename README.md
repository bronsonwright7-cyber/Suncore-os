# Suncore OS

Solar operations CRM and workflow portal for Suncore Solar.

Production application, not a demo. See `docs/ARCHITECTURE.md` for the system design and the
approved architecture decisions behind it.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router), TypeScript (strict mode)
- [Supabase](https://supabase.com) (Postgres, Auth, Storage) with Row Level Security as the
  primary access-control boundary
- [Tailwind CSS](https://tailwindcss.com) 4 + [shadcn/ui](https://ui.shadcn.com) foundation
- Deployed on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project's values
npm run dev
```

Requires Node.js 20.9+ and a Supabase project (see `docs/DATABASE.md` for how to apply the
schema). Without valid Supabase credentials in `.env.local`, the app will build and the sign-in
page will render, but auth calls will fail.

## Scripts

| Command                | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Start the dev server                             |
| `npm run build`         | Production build                                 |
| `npm run start`         | Run the production build                         |
| `npm run lint`          | ESLint                                            |
| `npm run typecheck`     | `tsc --noEmit`                                   |
| `npm run format`        | Prettier, writes changes                         |
| `npm run format:check`  | Prettier, check only (used in CI)                |

## Project structure

```
src/
  app/
    (auth)/       Sign-in and other unauthenticated routes
    (dashboard)/  Office/Admin-facing routes (protected)
    (crew)/       Crew-facing routes (protected)
  components/     Shared UI components
  lib/
    supabase/     Browser/server Supabase clients, session-refresh helper
    constants.ts  Labels for text+CHECK-constraint category columns
    utils.ts      cn() class-merging helper (shadcn/ui)
  server/         Server Actions and other server-only logic, by feature
  types/
    database.ts   Hand-written Database type (see the file header before editing)
  proxy.ts        Session refresh + protected-route redirect (Next's middleware layer)
supabase/
  migrations/     The full database schema, in numbered, reviewable files
docs/
  ARCHITECTURE.md     System design and the decisions behind it
  DATABASE.md         Schema, relationships, RLS model, how to apply migrations
  ENVIRONMENT.md       Every environment variable, what it's for, where to get it
  DEVELOPMENT.md       Day-to-day workflow, conventions, how to add a migration
```

## Status

**Phase 0 (Foundation) — complete.** Auth scaffolding only; no feature UI yet. See
`docs/ARCHITECTURE.md` for the phased roadmap.
