-- Crew-facing view of jobs that excludes financial fields and internal
-- scheduling_notes at the query level -- not just hidden in the UI.
--
-- security_invoker = true (Postgres 15+) is essential: it makes the view
-- enforce the *querying user's* RLS policies on the underlying `jobs` table,
-- rather than the view owner's privileges. Without it, this view would leak
-- every job regardless of RLS.
create view jobs_crew_view
with (security_invoker = true)
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
from jobs;

comment on view jobs_crew_view is
  'Crew-facing job view. Excludes estimated_amount/approved_amount/invoice_amount/payment_status/scheduling_notes by construction. Still subject to the querying user''s RLS on jobs via security_invoker.';

grant select on jobs_crew_view to authenticated;
