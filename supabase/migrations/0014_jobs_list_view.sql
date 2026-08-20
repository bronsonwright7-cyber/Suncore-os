-- Flattened, joined view backing the office/admin job list (Phase 1):
-- customer name, property address, crew name, and job type label alongside
-- every job column, so the list page can filter/sort/search with simple
-- single-table PostgREST calls instead of fragile embedded-resource query
-- syntax across four tables.
--
-- security_invoker = true is correct here (unlike jobs_crew_view): this view
-- is only ever queried by roles that already have full column access to
-- `jobs` directly (Owner/Admin/Office/QA -- see 0013), so there is no
-- column-hiding requirement, only the normal per-row RLS of the underlying
-- tables, which security_invoker correctly delegates to.
create view jobs_list_view
with (security_invoker = true)
as
select
  j.*,
  c.id as customer_id,
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  p.address_line1 as property_address_line1,
  p.city as property_city,
  p.state as property_state,
  cr.name as assigned_crew_name,
  jt.label as job_type_label
from jobs j
join properties p on p.id = j.property_id
join customers c on c.id = p.customer_id
left join crews cr on cr.id = j.assigned_crew_id
left join job_types jt on jt.id = j.job_type_id;

comment on view jobs_list_view is
  'Read-only, joined view for the office job list (search/sort/filter). Not for writes -- use jobs directly / fn_transition_job_status().';

grant select on jobs_list_view to authenticated;
