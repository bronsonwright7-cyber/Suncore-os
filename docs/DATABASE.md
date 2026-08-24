# Database

Schema lives in `supabase/migrations/`, as numbered SQL files applied in order. There is no ORM --
queries go through the typed Supabase client (`src/types/database.ts`).

## Applying the migrations

You need a Supabase project first (see `docs/ENVIRONMENT.md` for where to get its keys).

**Option A -- Supabase SQL Editor (simplest, no local setup):** open each file in
`supabase/migrations/` in numeric order and run it in the project's SQL Editor.

**Option B -- Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

After applying migrations (either way), regenerate the TypeScript types from the real schema:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

`src/types/database.ts` as currently committed is a **hand-written bootstrap file** written to
match the migrations exactly, so the app type-checks before a live project exists. Re-run the
command above after every future migration so it doesn't drift from the real schema.

## Verification performed

No Docker or local Postgres was available in the environment these migrations were authored in,
so they could not be executed end-to-end against a real database. Every migration file was
validated with the actual PostgreSQL parser (via `libpg-query`, a Node binding to Postgres's own
parser) and confirmed syntactically valid. That confirms syntax, not full semantic execution
(e.g. a column reference typo across files would not be caught by parsing alone). **Run the
migrations against a real Supabase project and exercise each role before relying on this in
production.**

## Tables

| Table                          | Purpose                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                     | 1:1 extension of `auth.users`. Holds `role` (nullable -- no role = no access).                                             |
| `customers`                    |                                                                                                                            |
| `properties`                   | Belongs to a customer.                                                                                                     |
| `solar_systems`                | Belongs to a property.                                                                                                     |
| `partners`                     | Roofing partners / solar companies jobs can originate from.                                                                |
| `job_types`                    | Lookup table (Install, Repair, Maintenance, ...), seeded, Admin-editable.                                                  |
| `employees`                    | May or may not have a linked `profiles` login. `job_title` (trade) is distinct from `profiles.role` (system access level). |
| `crews`                        |                                                                                                                            |
| `crew_members`                 | Time-bounded (`start_date`/`end_date`) employee-to-crew membership.                                                        |
| `job_status_transitions`       | The legal state-machine graph, as data.                                                                                    |
| `jobs`                         | The core record. See below.                                                                                                |
| `job_status_history`           | Append-only status transition log.                                                                                         |
| `job_events`                   | Append-only broader timeline (status changes + photos/reschedules/notes/QA).                                               |
| `job_assignments`              | Every employee who worked a job (beyond the single primary assignment on `jobs`).                                          |
| `photos`, `documents`, `notes` | Per job.                                                                                                                   |
| `communications`               | Per customer, optionally linked to a job.                                                                                  |
| `audit_log`                    | Generic system-wide field-change record, written by trigger only.                                                          |

`jobs` has no `customer_id` column -- reach the customer via `jobs.property_id ->
properties.customer_id`, so it can't drift out of sync.

## The job workflow (state machine)

```
NEW -> SCHEDULED -> ASSIGNED -> CREW_EN_ROUTE -> ON_SITE -> IN_PROGRESS -> COMPLETED -> QA -> CLOSED
                                                                                    QA -> IN_PROGRESS (rejection)
```

Defined as data in `job_status_transitions` (`supabase/migrations/0004_jobs.sql`), not hardcoded.

**`jobs.status` can only be changed by calling the `fn_transition_job_status(p_job_id, p_to_status,
p_reason)` RPC** -- never a plain `.update()`. Direct `UPDATE` of the `status` column is revoked
from the `authenticated` Postgres role entirely (`0009_rls_functions_and_policies.sql`), so this
is enforced for every role including Owner/Admin, not just in application code. The function:

1. Validates the transition against `job_status_transitions`.
2. Validates the caller is allowed to make _this specific_ transition (Office/Admin: any legal
   transition; QA: only `QA -> CLOSED` or `QA -> IN_PROGRESS`; Crew: only
   `CREW_EN_ROUTE`/`ON_SITE`/`IN_PROGRESS`/`COMPLETED`, and only on jobs they're assigned to).
3. Updates `jobs.status` and writes to `job_status_history` and `job_events` -- all three in one
   function call, so they can never drift apart.

Call it from a Server Action via `supabase.rpc("fn_transition_job_status", { p_job_id, p_to_status,
p_reason })`.

`job_events` also gets automatic entries from database triggers -- not application code -- for job
creation, scheduling/rescheduling, (re)assignment, and photo/document/note uploads. This means the
timeline stays complete even if a future code path forgets to log something explicitly.

## Row Level Security

RLS is enabled on every table and is the primary access boundary (grants are the outer gate;
policies are what actually decide access). No table grants anything to `anon` -- there is no
public/anonymous access anywhere in this app.

Roles (stored in `profiles.role`, nullable = no access to anything but your own profile row until
an Owner/Admin assigns one):

| Role                       | Access                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OWNER`, `ADMIN`           | Broad read/write everywhere; only roles that can change another user's `role`.                                                                                          |
| `OFFICE`                   | Same broad operational access as Admin for day-to-day data; cannot change roles.                                                                                        |
| `QA`                       | Broad read access (needs full context to review); can only drive `QA -> CLOSED` / `QA -> IN_PROGRESS`.                                                                  |
| `CREW_LEAD`, `CREW_MEMBER` | Read/write scoped to jobs they're assigned to (via `assigned_crew_id`, `assigned_employee_id`, or `job_assignments`). Cannot see `partners` or `communications` at all. |

Helper functions (`fn_is_admin()`, `fn_is_office_or_admin()`, `fn_can_read_broadly()`,
`fn_is_assigned_to_job()`, etc., in `0009_rls_functions_and_policies.sql`) implement "who is
asking" once, reused across every policy.

**Notable enforcement mechanisms beyond ordinary row policies:**

- **Role changes** (`profiles.role`): RLS alone can't distinguish "you, editing your own row" from
  "an admin, editing your role", since every signed-in user shares the same Postgres `authenticated`
  role in Supabase. Enforced instead by a `BEFORE UPDATE` trigger (`fn_protect_profile_role`) that
  rejects a role change unless the caller is already an Admin/Owner.
- **`job_status_history` / `job_events` / `audit_log`**: no client role has any INSERT/UPDATE/
  DELETE grant on these at all. They're written only by `SECURITY DEFINER` trigger functions,
  which run as the table owner and so bypass RLS/grants entirely. A default-deny table with no
  matching policy denies `authenticated` by default -- that's deliberate here, not an oversight.
- **Financial fields aren't crew-visible, and it's not just a UI decision.** `jobs_crew_view`
  (as redefined in `0013_jobs_crew_view_security_fix.sql`) excludes `estimated_amount`,
  `approved_amount`, `invoice_amount`, `payment_status`, and `scheduling_notes` by construction.
  It does **not** use `security_invoker` -- it runs with the view owner's privileges and
  implements its own row filter (`fn_can_read_broadly() or fn_is_assigned_to_job(id)`), because a
  security_invoker view can't restrict columns beyond what the caller's own RLS on the base table
  already allows (RLS is row-level, not column-level). To make this hold, crew has **no** direct
  SELECT access to the base `jobs` table at all (`jobs_select` policy is
  `fn_can_read_broadly()` only) -- `jobs_crew_view` is the only way crew reads job data. Query
  this view from crew-facing code, never `jobs` directly.
- **`jobs_list_view`** (`0014_jobs_list_view.sql`) is a separate, joined/flattened view (customer
  name, property address, crew name, job type label alongside every job column) backing the
  office job list's search/sort/filter. Unlike `jobs_crew_view`, it correctly uses
  `security_invoker = true` -- it's only ever queried by roles that already have full column
  access to `jobs` directly, so there's no column-hiding requirement, only normal per-row RLS.
- **Hard deletes are mostly disabled at the database level**, not just missing from the UI -- see
  "What's deliberately not built yet" in `docs/ARCHITECTURE.md`.
- **`created_by`/`updated_by` are stamped by trigger, not by application code** -- see
  "Attribution" below.

## Attribution (`created_by` / `updated_by`)

`customers`, `properties`, `solar_systems`, `partners`, `employees`, `crews`, `crew_members`,
`jobs`, and `job_assignments` (`created_by` only -- see below) carry `created_by`/`updated_by`
columns. As of `0015_attribution_triggers.sql`, these are populated automatically by a `BEFORE
INSERT OR UPDATE` trigger (`fn_stamp_attribution`, or `fn_stamp_created_by` for the one
insert-only table) -- **no Server Action sets them**, and none should:

- **Insert:** `created_by` and `updated_by` are set to `auth.uid()`.
- **Update:** `updated_by` is set to `auth.uid()`; `created_by` is reset to its existing value
  unconditionally, i.e. it's immutable after insert.
- **Anti-spoofing:** whenever `auth.uid()` resolves to a real caller (every ordinary
  authenticated request), the trigger overwrites whatever value the client sent for these
  columns -- a client cannot attribute a row to a different user by passing an arbitrary
  `created_by`/`updated_by` in the insert/update payload.
- **`auth.uid()` is null:** only possible in a trusted server-side context with no end-user
  session (e.g. an admin/service-role backfill script) -- there is no path for an ordinary
  `authenticated` request to produce a null `auth.uid()`. In that case the trigger preserves
  whatever value the caller supplied, so trusted server code can still attribute
  historical/imported rows explicitly.
- `job_assignments` has `created_by` but no `updated_by`/`updated_at` (it's insert-only today --
  see the `jobs`/`job_assignments` table note above); it uses the insert-only
  `fn_stamp_created_by` trigger instead of `fn_stamp_attribution`, so a future update to that
  table can't hit a missing-column error.
- This also fixed `job_events`/`job_status_history` attribution for the `'created'` event, which
  is derived from `jobs.created_by` (`fn_log_job_created_event` in `0008_triggers.sql`) -- that
  event's `actor_id`/`changed_by` was silently null before this migration.

## Indexes

See `supabase/migrations/0007_indexes.sql`. Covers the query patterns the app leans on constantly:
jobs by status/priority/appointment date/assigned crew/assigned employee/property/partner/type,
crew schedule-by-day, job timeline and status history lookups (by job + time), and active crew
membership.

## Category values (text + CHECK constraint columns)

These are deliberately not tables (see `docs/ARCHITECTURE.md`), so there's no row data to seed.
The constraint in SQL is authoritative; `src/lib/constants.ts` mirrors it for the app layer --
update both together if a value is added or removed.

- `jobs.priority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`
- `jobs.source`: `roofing_partner`, `solar_company`, `homeowner`, `warranty`, `referral`,
  `internal`, `other`
- `jobs.payment_status`: `NOT_INVOICED`, `INVOICED`, `PARTIALLY_PAID`, `PAID`, `VOID`
- `employees.employee_type`: `EMPLOYEE`, `CONTRACTOR`, `SUBCONTRACTOR`
- `profiles.role`: `OWNER`, `ADMIN`, `OFFICE`, `CREW_LEAD`, `CREW_MEMBER`, `QA`
- `partners.partner_type`: `roofing_partner`, `solar_company`, `other`

`job_types` _is_ a real, seeded, Admin-editable table (8 starting rows in
`0012_seed_data.sql`) -- see `docs/ARCHITECTURE.md` for why it's treated differently.

## Storage

Photos/documents reference a `storage_path` column; the actual files live in Supabase Storage, not
Postgres. **Not yet created:** the Storage buckets themselves and their access policies. When
building the photo/document upload feature, create buckets (e.g. `job-photos`, `job-documents`) in
the Supabase dashboard and write Storage RLS policies mirroring the table policies above (crew can
upload/read for jobs they're assigned to; Office/Admin/QA read everything).
