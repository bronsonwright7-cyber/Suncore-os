-- ---------------------------------------------------------------------------
-- RLS helper functions.
--
-- All are STABLE + SECURITY DEFINER with a locked-down search_path (standard
-- Supabase pattern): they read profiles/employees/crew_members to answer
-- "who is asking" without re-triggering RLS recursion, and can't be tricked
-- via search_path hijacking.
-- ---------------------------------------------------------------------------

create or replace function fn_current_role()
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function fn_is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(fn_current_role() in ('OWNER', 'ADMIN'), false);
$$;

create or replace function fn_is_office_or_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(fn_current_role() in ('OWNER', 'ADMIN', 'OFFICE'), false);
$$;

-- Broad read access: everyone who needs full operational visibility to do
-- their job (Owner/Admin/Office/QA), as opposed to crew, who only see jobs
-- they're assigned to.
create or replace function fn_can_read_broadly()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(fn_current_role() in ('OWNER', 'ADMIN', 'OFFICE', 'QA'), false);
$$;

create or replace function fn_current_employee_id()
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select id from employees where profile_id = auth.uid();
$$;

create or replace function fn_current_crew_ids()
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select cm.crew_id
  from crew_members cm
  join employees e on e.id = cm.employee_id
  where e.profile_id = auth.uid()
    and (cm.end_date is null or cm.end_date >= current_date);
$$;

create or replace function fn_is_assigned_to_job(p_job_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from jobs j
    where j.id = p_job_id
      and (
        j.assigned_employee_id = fn_current_employee_id()
        or j.assigned_crew_id in (select fn_current_crew_ids())
      )
  )
  or exists (
    select 1 from job_assignments ja
    where ja.job_id = p_job_id
      and ja.employee_id = fn_current_employee_id()
      and ja.unassigned_at is null
  );
$$;

-- Only an Owner/Admin may change a profile's role. RLS's UPDATE policy alone
-- can't express this distinction (every logged-in user shares the same
-- Postgres `authenticated` role in Supabase), so it's enforced here instead.
create or replace function fn_protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not fn_is_admin() then
    raise exception 'Only an administrator can change a user role.';
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_role
before update on profiles
for each row execute function fn_protect_profile_role();

-- ---------------------------------------------------------------------------
-- Grants. RLS is the real access boundary (below); these grants are the
-- outer gate PostgREST checks first. No anonymous access anywhere -- this is
-- an internal operations tool, not a public-facing app.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Nobody (including Office/Admin) may change a job's status via a plain
-- UPDATE. It must go through fn_transition_job_status() (see 0010), which
-- runs as the function owner and so bypasses this revoke -- guaranteeing
-- job_status_history/job_events can never drift out of sync with jobs.status.
revoke update (status) on jobs from authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security. Every table is enabled below; a table with RLS
-- enabled and no matching policy denies all access to `authenticated` by
-- default -- that default-deny is deliberate for job_status_history,
-- job_events, and audit_log, which are written only by trusted trigger
-- functions running as the table owner (which bypasses RLS).
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table customers enable row level security;
alter table properties enable row level security;
alter table solar_systems enable row level security;
alter table partners enable row level security;
alter table job_types enable row level security;
alter table job_status_transitions enable row level security;
alter table jobs enable row level security;
alter table job_status_history enable row level security;
alter table job_events enable row level security;
alter table employees enable row level security;
alter table crews enable row level security;
alter table crew_members enable row level security;
alter table job_assignments enable row level security;
alter table photos enable row level security;
alter table documents enable row level security;
alter table notes enable row level security;
alter table communications enable row level security;
alter table audit_log enable row level security;

-- profiles: everyone can see/update their own row; Admin/Owner can see/update
-- everyone's (role changes are further gated by the trigger above).
create policy profiles_select on profiles for select
  using (id = auth.uid() or fn_is_admin());
create policy profiles_update on profiles for update
  using (id = auth.uid() or fn_is_admin())
  with check (id = auth.uid() or fn_is_admin());

-- customers
create policy customers_select on customers for select
  using (
    fn_can_read_broadly()
    or exists (
      select 1 from properties p
      join jobs j on j.property_id = p.id
      where p.customer_id = customers.id and fn_is_assigned_to_job(j.id)
    )
  );
create policy customers_insert on customers for insert
  with check (fn_is_office_or_admin());
create policy customers_update on customers for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- properties
create policy properties_select on properties for select
  using (
    fn_can_read_broadly()
    or exists (select 1 from jobs j where j.property_id = properties.id and fn_is_assigned_to_job(j.id))
  );
create policy properties_insert on properties for insert
  with check (fn_is_office_or_admin());
create policy properties_update on properties for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- solar_systems
create policy solar_systems_select on solar_systems for select
  using (
    fn_can_read_broadly()
    or exists (select 1 from jobs j where j.solar_system_id = solar_systems.id and fn_is_assigned_to_job(j.id))
  );
create policy solar_systems_insert on solar_systems for insert
  with check (fn_is_office_or_admin());
create policy solar_systems_update on solar_systems for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- partners: Office/Admin only. Not visible to crew or QA.
create policy partners_select on partners for select
  using (fn_is_office_or_admin());
create policy partners_insert on partners for insert
  with check (fn_is_office_or_admin());
create policy partners_update on partners for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- job_types: a lookup table every signed-in role needs for dropdowns;
-- writable by Admin only.
create policy job_types_select on job_types for select
  using (auth.uid() is not null);
create policy job_types_insert on job_types for insert
  with check (fn_is_admin());
create policy job_types_update on job_types for update
  using (fn_is_admin()) with check (fn_is_admin());

-- job_status_transitions: reference data describing the workflow graph;
-- readable by anyone signed in (the UI uses it to know which buttons to
-- show), not writable by any client role.
create policy job_status_transitions_select on job_status_transitions for select
  using (auth.uid() is not null);

-- jobs
create policy jobs_select on jobs for select
  using (fn_can_read_broadly() or fn_is_assigned_to_job(id));
create policy jobs_insert on jobs for insert
  with check (fn_is_office_or_admin());
create policy jobs_update on jobs for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());
-- No delete policy: jobs are never hard-deleted (preserves the audit trail).
-- Use a future cancelled/void status instead.

-- job_status_history / job_events: read-scoped like jobs; no insert/update/
-- delete policy for any client role -- only the SECURITY DEFINER trigger
-- functions (owned by the migration role) can write to them.
create policy job_status_history_select on job_status_history for select
  using (fn_can_read_broadly() or fn_is_assigned_to_job(job_id));
create policy job_events_select on job_events for select
  using (fn_can_read_broadly() or fn_is_assigned_to_job(job_id));

-- employees: broad roles see everyone; crew can see their own record only
-- for now (seeing teammates can be added later if needed).
create policy employees_select on employees for select
  using (fn_can_read_broadly() or profile_id = auth.uid());
create policy employees_insert on employees for insert
  with check (fn_is_office_or_admin());
create policy employees_update on employees for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- crews: broad roles see all; crew members see their own current crew(s).
create policy crews_select on crews for select
  using (
    fn_can_read_broadly()
    or exists (
      select 1 from crew_members cm
      where cm.crew_id = crews.id
        and cm.employee_id = fn_current_employee_id()
        and cm.end_date is null
    )
  );
create policy crews_insert on crews for insert
  with check (fn_is_office_or_admin());
create policy crews_update on crews for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- crew_members
create policy crew_members_select on crew_members for select
  using (fn_can_read_broadly() or employee_id = fn_current_employee_id());
create policy crew_members_insert on crew_members for insert
  with check (fn_is_office_or_admin());
create policy crew_members_update on crew_members for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());
-- Pure relationship rows: Office/Admin may delete a mistaken membership
-- entry (normal correction, not loss of business history).
create policy crew_members_delete on crew_members for delete
  using (fn_is_office_or_admin());

-- job_assignments
create policy job_assignments_select on job_assignments for select
  using (fn_can_read_broadly() or employee_id = fn_current_employee_id());
create policy job_assignments_insert on job_assignments for insert
  with check (fn_is_office_or_admin());
create policy job_assignments_update on job_assignments for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());
create policy job_assignments_delete on job_assignments for delete
  using (fn_is_office_or_admin());

-- photos: crew can upload for jobs they're assigned to; broad roles manage all.
create policy photos_select on photos for select
  using (fn_can_read_broadly() or fn_is_assigned_to_job(job_id));
create policy photos_insert on photos for insert
  with check (fn_is_office_or_admin() or fn_is_assigned_to_job(job_id));
create policy photos_update on photos for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());
create policy photos_delete on photos for delete
  using (fn_is_office_or_admin());

-- documents: same pattern as photos.
create policy documents_select on documents for select
  using (fn_can_read_broadly() or fn_is_assigned_to_job(job_id));
create policy documents_insert on documents for insert
  with check (fn_is_office_or_admin() or fn_is_assigned_to_job(job_id));
create policy documents_update on documents for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());
create policy documents_delete on documents for delete
  using (fn_is_office_or_admin());

-- notes: crew can add notes on jobs they're assigned to; immutable once
-- posted (no update policy) -- correct by deleting (Office/Admin) and re-adding.
create policy notes_select on notes for select
  using (fn_can_read_broadly() or fn_is_assigned_to_job(job_id));
create policy notes_insert on notes for insert
  with check (fn_is_office_or_admin() or fn_is_assigned_to_job(job_id));
create policy notes_delete on notes for delete
  using (fn_is_office_or_admin());

-- communications: Office/Admin only -- crew doesn't handle customer
-- communication in this phase.
create policy communications_select on communications for select
  using (fn_is_office_or_admin());
create policy communications_insert on communications for insert
  with check (fn_is_office_or_admin());
create policy communications_update on communications for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());

-- audit_log: Owner/Admin read-only. No client role may write to it directly.
create policy audit_log_select on audit_log for select
  using (fn_is_admin());
