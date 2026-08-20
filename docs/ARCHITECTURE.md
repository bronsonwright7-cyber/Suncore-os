# Architecture

Suncore OS is a single-tenant, production application for Suncore Solar (~800 jobs/month today,
designed to scale well beyond that). This document records the approved architecture and the
reasoning behind the decisions that aren't obvious from the code.

## Application architecture

- **Next.js 16, App Router, TypeScript strict mode.** Server Components by default; Client
  Components only where interactivity is required (forms, status actions).
- **Server Actions** for mutations, backed by a `server/` data-access layer, rather than a
  separate REST/API-route layer -- fewer moving parts, one place to review for security.
- **Supabase** for Postgres, Auth, and Storage. Two client factories:
  - `src/lib/supabase/client.ts` -- browser client (anon key), for Client Components.
  - `src/lib/supabase/server.ts` -- server client, scoped to the requesting user's session via
    cookies, for Server Components/Actions.
  - The service-role key is never used in application code (see `docs/ENVIRONMENT.md`).
- **`src/proxy.ts`** (Next's middleware/proxy layer) refreshes the Supabase session on every
  request and redirects unauthenticated requests away from `/dashboard` and `/crew`.
- **Row Level Security is the primary access-control boundary**, not the UI. See
  `docs/DATABASE.md` for the full model. App-layer role checks are a second layer, not the only
  one.
- **Tailwind CSS 4 + shadcn/ui foundation.** Components are added via the shadcn CLI as features
  are built; only the foundation (`components.json`, design tokens in `globals.css`,
  `lib/utils.ts`) exists so far.

## Route groups

- `(auth)` -- sign-in, unauthenticated.
- `(dashboard)` -- Office/Admin-facing routes at `/dashboard/*`.
- `(crew)` -- crew-facing, mobile-first routes at `/crew/*`.

Route groups organize layouts only; they don't affect URLs. Each group has its own explicit URL
segment (`/dashboard`, `/crew`) rather than living at `/`, so the root `(dashboard)`/`(crew)`
layouts can't collide with each other or with the root redirect page.

## Key decisions

**Single-tenant.** Built for Suncore Solar only, not a multi-company SaaS product. Simplifies the
schema and RLS significantly. If multi-tenancy is ever needed, it's a deliberate future migration
(adding an `organization_id` and rewriting every policy), not a default we designed around.

**Text + CHECK constraints over native Postgres ENUMs**, for category columns expected to change
over time (`priority`, `source`, `employee_type`, `payment_status`, `partner_type`, etc.) --
approved 2026-08-20. Postgres `ENUM` types are awkward to modify later (`ALTER TYPE ... ADD VALUE`
has transaction restrictions); a CHECK constraint is a trivial migration. The allowed values are
documented in `docs/DATABASE.md` and mirrored as TypeScript constants in `src/lib/constants.ts`,
which is the single source of truth for the app layer -- keep both in sync when the constraint
changes.

**`job_status_transitions` is a real table**, not hardcoded logic, so the workflow graph is
queryable (the UI can ask "what can this job move to next?") and extendable via a data migration
(e.g. adding a future REWORK state) instead of a code change.

**Three distinct history/timeline concepts, not one:**

- `job_status_history` -- strict, append-only log of status transitions. The audit trail for the
  state machine.
- `job_events` -- the broader chronological narrative (status changes plus photos, reschedules,
  notes, QA decisions...). This is the intended foundation for the future AI operations
  assistant to reason over ("summarize this job", "what's stalled").
- `audit_log` -- generic, system-wide, low-level field-change record across any table. Compliance/
  debugging, not a user-facing feed.

Status changes write to both `job_status_history` and `job_events` atomically, through a single
trusted path (`fn_transition_job_status`, see `docs/DATABASE.md`) -- they can never drift apart.

**No `customers` FK on `jobs`.** A job's customer is reached by joining through
`properties.customer_id`, not duplicated onto `jobs`, so it can never drift out of sync with the
property's actual owner. This differs slightly from the originally discussed Customer-1-many-Jobs
diagram; flagged as a deliberate integrity-preserving adjustment.

**Financial fields exist on `jobs` now, with no invoicing feature.** `estimated_amount`,
`approved_amount`, `invoice_amount`, `payment_status` are schema-ready placeholders per the
approved MVP scope, so the accounting feature (a future phase) doesn't require a schema rework.
They're hidden from the crew-facing view/role at the database level (see `docs/DATABASE.md`), not
just in the UI.

**Jobs, and most historical records, are never hard-deleted.** No DELETE policy exists for
`customers`, `properties`, `solar_systems`, `jobs`, `job_status_history`, `job_events`,
`communications`, `audit_log`, `employees`, `crews`, or `partners` -- use an `is_active` flag or a
future cancelled/void status instead. DELETE is allowed only for `photos`, `documents`, `notes`,
`crew_members`, and `job_assignments`, where a mistaken entry is a normal correction rather than a
loss of business history. If the business needs a real "delete this job" workflow later, that's a
deliberate product decision to revisit, not an oversight.

**Dashboard as a future command center, not a report.** No extra tables were added for this in
Phase 0 -- `jobs`/`job_events` are indexed for the query patterns a command-center dashboard needs
(status, appointment date, assigned crew, at-risk/overdue lookups). "Crews that haven't checked
in" is intended to be derived from `job_events` timestamps rather than a dedicated check-in
feature, at least initially; revisit if that proves too indirect in practice.

## What's deliberately not built yet

Per the approved MVP scope: AI operations assistant, accounting/invoicing logic or UI, customer
portal, SMS automation, inventory, payroll, native mobile app. The schema has placeholders for
some of these (financials on `jobs`); there is no UI or business logic behind them.

## Roadmap

- **Phase 0 -- Foundation** (this phase): Next.js scaffold, Supabase schema + RLS, GitHub ->
  Vercel CI/CD, base auth, design system foundation.
- **Phase 1 -- Core data model**: Customers, Properties, Solar Systems, Employees, Crews -- CRUD
  with role-based access.
- **Phase 2 -- Job workflow engine**: Jobs, status transitions, status history, crew assignment
  UI.
- **Phase 3 -- Crew mobile interface**: responsive job view, status updates, photo upload from the
  field.
- **Phase 4 -- QA & management dashboard**: closeout flow, live status board for the office.
- **Phase 5 -- Documents, Notes, Customer communication log.**
- **Phase 6 -- Reporting/analytics.**
- **Phase 7 -- AI operations assistant.**
- **Phase 8 -- Future**: customer portal, SMS/email automation, accounting/invoicing, deeper
  integrations.
