-- The job workflow state machine and the jobs table itself.

-- Data-driven definition of legal status transitions. Queryable by the app
-- (e.g. "what statuses can this job move to next?") and extendable later
-- (e.g. adding a REWORK state) via a data migration instead of code changes.
create table job_status_transitions (
  from_status text not null,
  to_status text not null,
  primary key (from_status, to_status)
);

insert into job_status_transitions (from_status, to_status) values
  ('NEW', 'SCHEDULED'),
  ('SCHEDULED', 'ASSIGNED'),
  ('ASSIGNED', 'CREW_EN_ROUTE'),
  ('CREW_EN_ROUTE', 'ON_SITE'),
  ('ON_SITE', 'IN_PROGRESS'),
  ('IN_PROGRESS', 'COMPLETED'),
  ('COMPLETED', 'QA'),
  ('QA', 'CLOSED'),
  ('QA', 'IN_PROGRESS'); -- QA rejection returns the job to IN_PROGRESS (approved 2026-08-20)

create table jobs (
  id uuid primary key default gen_random_uuid(),
  -- Human-friendly sequential job number (e.g. "Job #4521"), distinct from
  -- the UUID primary key.
  job_number bigint generated always as identity unique,

  -- Every job happens at a property; the customer is reached by joining
  -- through properties.customer_id rather than duplicating customer_id here,
  -- so a job's customer can never drift out of sync with its property's
  -- actual owner.
  property_id uuid not null references properties (id),
  solar_system_id uuid references solar_systems (id),
  job_type_id uuid references job_types (id),

  status text not null default 'NEW' check (
    status in (
      'NEW', 'SCHEDULED', 'ASSIGNED', 'CREW_EN_ROUTE', 'ON_SITE',
      'IN_PROGRESS', 'COMPLETED', 'QA', 'CLOSED'
    )
  ),
  priority text not null default 'NORMAL' check (
    priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')
  ),

  source text check (
    source in (
      'roofing_partner', 'solar_company', 'homeowner', 'warranty',
      'referral', 'internal', 'other'
    )
  ),
  partner_id uuid references partners (id),

  title text not null,
  description text,

  -- Scheduling
  appointment_date date,
  appointment_start_time time,
  appointment_end_time time,
  -- e.g. "Morning", "8am-12pm" -- for when only a window is promised, not an
  -- exact start/end time.
  appointment_window text,
  assigned_crew_id uuid references crews (id),
  assigned_employee_id uuid references employees (id),
  -- Internal dispatch notes. Never customer-visible; excluded from the
  -- crew-facing view (see 0011_crew_restricted_view.sql).
  scheduling_notes text,

  -- Financial placeholders. No invoicing logic/UI in the MVP -- these exist
  -- so the schema doesn't need to be reworked when that feature is built.
  estimated_amount numeric(10, 2),
  approved_amount numeric(10, 2),
  invoice_amount numeric(10, 2),
  payment_status text not null default 'NOT_INVOICED' check (
    payment_status in ('NOT_INVOICED', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'VOID')
  ),

  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id),

  constraint jobs_appointment_time_order check (
    appointment_end_time is null
    or appointment_start_time is null
    or appointment_end_time > appointment_start_time
  )
);

comment on table jobs is
  'Core job record. Status must only be changed via fn_transition_job_status() -- see 0010.';
comment on column jobs.scheduling_notes is
  'Internal dispatch notes only. Never expose to customers or in the crew-facing view.';

-- Guard against attaching a solar system that doesn't belong to the job's
-- property (e.g. wrong property selected in a form).
create or replace function fn_validate_job_solar_system()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.solar_system_id is not null then
    if not exists (
      select 1 from solar_systems s
      where s.id = new.solar_system_id and s.property_id = new.property_id
    ) then
      raise exception 'The selected solar system does not belong to the selected property.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_validate_job_solar_system
before insert or update on jobs
for each row execute function fn_validate_job_solar_system();
