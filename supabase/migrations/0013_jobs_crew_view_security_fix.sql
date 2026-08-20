-- Phase 0 hardening fix, found while building the Phase 1 jobs list.
--
-- jobs_crew_view was originally defined with security_invoker = true, which
-- sounds like the safer option but isn't, here: RLS is row-level, not
-- column-level, so the base `jobs_select` policy already let a crew member
-- read every column (including estimated_amount/approved_amount/
-- invoice_amount/payment_status) of their own assigned jobs directly. The
-- view only hid those columns for callers who *chose* to use it -- a crew
-- user hitting the REST API directly against /jobs could bypass it.
--
-- Fix: the view now owns its own row-filtering logic (re-implementing the
-- same "can this user see this job" check that fn_is_assigned_to_job()
-- uses) and runs with the view owner's privileges rather than the caller's,
-- so it can select a safe column list regardless of what the base table
-- would otherwise allow. Crew's direct SELECT access to the base `jobs`
-- table is removed entirely -- Office/Admin/OFFICE/QA (fn_can_read_broadly)
-- keep full direct access; Crew Lead/Member must go through this view.

drop view if exists jobs_crew_view;

create view jobs_crew_view
as
select
  id,
  job_number,
  property_id,
  solar_system_id,
  job_type_id,
  status,
  priority,
  source,
  partner_id,
  title,
  description,
  appointment_date,
  appointment_start_time,
  appointment_end_time,
  appointment_window,
  assigned_crew_id,
  assigned_employee_id,
  created_at,
  updated_at
from jobs
where fn_can_read_broadly() or fn_is_assigned_to_job(id);

comment on view jobs_crew_view is
  'Crew-facing job view. Excludes financial/internal-scheduling columns by construction and implements its own row filter (not security_invoker) so crew cannot bypass the column restriction via direct table access.';

grant select on jobs_crew_view to authenticated;

-- Crew no longer has any direct SELECT on the base jobs table -- only
-- through jobs_crew_view above, or job_status_history/job_events (already
-- separately scoped) for jobs they're assigned to.
drop policy if exists jobs_select on jobs;

create policy jobs_select on jobs for select
  using (fn_can_read_broadly());
