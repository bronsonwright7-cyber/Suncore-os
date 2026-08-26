-- Reporting functions for the future "Ask Suncore AI" feature (Phase A --
-- foundation only, not yet wired to any AI code).
--
-- SECURITY INVOKER BY DESIGN -- every function below deliberately omits
-- `security definer`, so each runs with the CALLING USER's own privileges.
-- auth.uid() inside these functions resolves to the actual caller (set by
-- PostgREST per-request regardless of whether the call is a plain table
-- query or an RPC), and every query inside these functions is still subject
-- to the exact same RLS policies as a direct table query -- see 0009. A
-- crew member calling fn_report_crew_completions() gets rows scoped to
-- jobs they can actually see under jobs_select ("fn_can_read_broadly()
-- only" as of 0013); nothing here grants broader access than the app
-- already has. Do not add `security definer` to anything in this file --
-- that would bypass RLS and defeat the point.
--
-- Each function returns only the minimal aggregated columns needed to
-- answer its specific report -- no raw job/customer rows, no PII beyond a
-- crew's name (a business entity, needed to answer "which crew"). This is
-- deliberately NOT a generic "run arbitrary SQL" tool -- it's a fixed,
-- narrow library of parameterized reports, expanded over time as new
-- question patterns emerge.
--
-- "Revenue" here is an approximation: there is no invoicing ledger yet
-- (see docs/ARCHITECTURE.md), so it is derived from the financial
-- placeholder columns already on `jobs` (estimated_amount/approved_amount/
-- invoice_amount), preferring the most concrete figure available per job.
-- The `approx_revenue` column name is deliberately not just `revenue`, to
-- keep that caveat visible at the data layer itself.

-- ---------------------------------------------------------------------------
-- fn_report_job_status_counts: current status distribution, optionally
-- scoped to jobs created within a date range.
-- ---------------------------------------------------------------------------
create or replace function fn_report_job_status_counts(
  p_date_from date default null,
  p_date_to date default null
)
returns table (status text, job_count bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  select j.status, count(*)::bigint as job_count
  from jobs j
  where (p_date_from is null or j.created_at::date >= p_date_from)
    and (p_date_to is null or j.created_at::date <= p_date_to)
  group by j.status;
$$;

grant execute on function fn_report_job_status_counts(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- fn_report_jobs_completed_by_month: monthly count of jobs whose most
-- recent transition into p_status falls in that month (defaults to
-- CLOSED). Uses the latest transition per job so a job that re-enters a
-- non-terminal status (e.g. COMPLETED -> QA -> IN_PROGRESS on QA
-- rejection, then COMPLETED again) is only counted once, in its most
-- recent month.
-- ---------------------------------------------------------------------------
create or replace function fn_report_jobs_completed_by_month(
  p_status text default 'CLOSED',
  p_months_back integer default 12
)
returns table (report_month date, job_count bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  with last_transition as (
    select h.job_id, max(h.changed_at) as last_changed_at
    from job_status_history h
    join jobs j on j.id = h.job_id
    where h.to_status = p_status
      and h.changed_at >= date_trunc('month', now()) - (p_months_back || ' months')::interval
    group by h.job_id
  )
  select
    date_trunc('month', last_changed_at)::date as report_month,
    count(*)::bigint as job_count
  from last_transition
  group by 1
  order by 1;
$$;

grant execute on function fn_report_jobs_completed_by_month(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- fn_report_revenue_by_month: approximate revenue for jobs whose most
-- recent transition to CLOSED falls in each month. See the file header
-- note on why this is an approximation.
-- ---------------------------------------------------------------------------
create or replace function fn_report_revenue_by_month(
  p_months_back integer default 12
)
returns table (report_month date, approx_revenue numeric, closed_job_count bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  with last_closed as (
    select h.job_id, max(h.changed_at) as closed_at
    from job_status_history h
    join jobs j on j.id = h.job_id
    where h.to_status = 'CLOSED'
      and h.changed_at >= date_trunc('month', now()) - (p_months_back || ' months')::interval
    group by h.job_id
  )
  select
    date_trunc('month', lc.closed_at)::date as report_month,
    coalesce(sum(coalesce(j.invoice_amount, j.approved_amount, j.estimated_amount, 0)), 0) as approx_revenue,
    count(*)::bigint as closed_job_count
  from last_closed lc
  join jobs j on j.id = lc.job_id
  group by 1
  order by 1;
$$;

grant execute on function fn_report_revenue_by_month(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- fn_report_crew_completions: job completions per crew within a date
-- range, based on each job's most recent transition to CLOSED.
-- ---------------------------------------------------------------------------
create or replace function fn_report_crew_completions(
  p_date_from date default null,
  p_date_to date default null
)
returns table (crew_id uuid, crew_name text, completed_count bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  with last_closed as (
    select h.job_id, max(h.changed_at) as closed_at
    from job_status_history h
    where h.to_status = 'CLOSED'
    group by h.job_id
  )
  select
    cr.id as crew_id,
    cr.name as crew_name,
    count(*)::bigint as completed_count
  from last_closed lc
  join jobs j on j.id = lc.job_id
  join crews cr on cr.id = j.assigned_crew_id
  where (p_date_from is null or lc.closed_at::date >= p_date_from)
    and (p_date_to is null or lc.closed_at::date <= p_date_to)
  group by cr.id, cr.name
  order by completed_count desc;
$$;

grant execute on function fn_report_crew_completions(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- fn_report_customers_added_by_month: new-customer count per month.
-- ---------------------------------------------------------------------------
create or replace function fn_report_customers_added_by_month(
  p_months_back integer default 12
)
returns table (report_month date, customer_count bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    date_trunc('month', c.created_at)::date as report_month,
    count(*)::bigint as customer_count
  from customers c
  where c.created_at >= date_trunc('month', now()) - (p_months_back || ' months')::interval
  group by 1
  order by 1;
$$;

grant execute on function fn_report_customers_added_by_month(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- fn_report_jobs_by_state: job counts and approximate revenue by property
-- state, within a date range (based on job creation), optionally limited
-- to a specific set of states (e.g. comparing CA/TX/FL).
-- ---------------------------------------------------------------------------
create or replace function fn_report_jobs_by_state(
  p_date_from date default null,
  p_date_to date default null,
  p_states text[] default null
)
returns table (state text, job_count bigint, approx_revenue numeric)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    p.state,
    count(*)::bigint as job_count,
    coalesce(sum(coalesce(j.invoice_amount, j.approved_amount, j.estimated_amount, 0)), 0) as approx_revenue
  from jobs j
  join properties p on p.id = j.property_id
  where (p_date_from is null or j.created_at::date >= p_date_from)
    and (p_date_to is null or j.created_at::date <= p_date_to)
    and (p_states is null or p.state = any (p_states))
  group by p.state
  order by job_count desc;
$$;

grant execute on function fn_report_jobs_by_state(date, date, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Indexes to support the queries above (and reporting generally) at scale.
-- Postgres does not auto-index these access patterns; the existing
-- job_status_history index is (job_id, changed_at), good for "this job's
-- timeline" but not for "every job that hit CLOSED across the company in
-- a date range".
-- ---------------------------------------------------------------------------
create index jobs_created_at_idx on jobs (created_at);
create index customers_created_at_idx on customers (created_at);
create index job_status_history_to_status_changed_at_idx on job_status_history (to_status, changed_at);
