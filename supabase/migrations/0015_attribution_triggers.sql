-- Fix: created_by/updated_by were always NULL in practice.
--
-- customers, properties, solar_systems, partners, employees, crews,
-- crew_members, jobs, and job_assignments all have created_by (and, except
-- job_assignments, updated_by) columns with no default -- and no Server
-- Action ever set them on insert/update. This trigger-based fix populates
-- them from the authenticated caller automatically, and prevents an
-- ordinary client from spoofing either field by passing an arbitrary value
-- in the insert/update payload: the trigger overrides whatever was sent
-- whenever a real caller identity (auth.uid()) is available.
--
-- Purely additive: new functions + new triggers only. No existing function,
-- trigger, policy, or grant is altered. fn_transition_job_status() already
-- sets updated_by = auth.uid() itself when moving jobs.status; the new
-- jobs trigger below is a no-op in that path (same value, recomputed).

-- ---------------------------------------------------------------------------
-- fn_stamp_attribution: for tables with both created_by and updated_by.
--
-- INSERT: created_by and updated_by are set to auth.uid() whenever a real
--   caller identity exists, ignoring any client-supplied value for either
--   column. If auth.uid() is null (a trusted server-side/service-role
--   context with no end-user session, e.g. an admin backfill script),
--   whatever value the caller supplied is preserved as-is -- this is
--   deliberate: it lets trusted server code attribute historical/imported
--   data, while giving ordinary authenticated clients no way to ever
--   produce a null-auth.uid() request.
-- UPDATE: created_by is immutable after insert -- always reset to the
--   existing value, regardless of what the client sent. updated_by follows
--   the same auth.uid()-wins-when-present rule as insert.
-- ---------------------------------------------------------------------------
create or replace function fn_stamp_attribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

comment on function fn_stamp_attribution is
  'Populates created_by/updated_by from auth.uid() on insert/update and makes created_by immutable after insert. Client-supplied values for these columns are ignored whenever auth.uid() is available; see docs/DATABASE.md.';

create trigger trg_stamp_attribution before insert or update on customers
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on properties
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on solar_systems
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on partners
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on employees
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on crews
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on crew_members
  for each row execute function fn_stamp_attribution();
create trigger trg_stamp_attribution before insert or update on jobs
  for each row execute function fn_stamp_attribution();

-- ---------------------------------------------------------------------------
-- fn_stamp_created_by: for job_assignments, which has created_by but no
-- updated_by/updated_at (it's never edited in place today -- see
-- docs/DATABASE.md -- only inserted, and "unassigned" via unassigned_at).
-- Insert-only, so a future update to this table can't hit a missing-column
-- error the way reusing fn_stamp_attribution's UPDATE branch would.
-- ---------------------------------------------------------------------------
create or replace function fn_stamp_created_by()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

comment on function fn_stamp_created_by is
  'Populates created_by from auth.uid() on insert, for tables with created_by but no updated_by. See fn_stamp_attribution.';

create trigger trg_stamp_created_by before insert on job_assignments
  for each row execute function fn_stamp_created_by();
