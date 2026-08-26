-- Atomic multi-table creation for AI Intake (Phase C revision -- see
-- src/server/intake/actions.ts). Creates a customer (or reuses an existing
-- one), a property, an optional solar system, and a job as ONE Postgres
-- transaction: a single RPC call is one top-level statement, so if any
-- insert below fails, everything this call inserted -- including rows from
-- earlier steps in the *same* call -- is rolled back automatically. There
-- is no partially-created outcome: this function either returns all ids or
-- raises and leaves nothing behind.
--
-- Why a database function is required at all: each existing pure insert
-- function (insertCustomer/insertProperty/insertSolarSystem/insertJob in
-- src/server/*/actions.ts) issues its own independent PostgREST request,
-- and PostgREST commits each request in its own transaction. Calling all
-- four sequentially from Node -- the original Phase C implementation --
-- cannot be made atomic no matter how the TypeScript is arranged; only a
-- single database call (this function, invoked once via supabase.rpc) can
-- share one transaction across all four inserts. Those four functions are
-- unchanged and still used exactly as before by the manual "New
-- Customer/Property/Solar System/Job" forms; this function reproduces the
-- same per-table column list and empty-string-to-null convention they use,
-- for the AI Intake confirmation path only.
--
-- SECURITY INVOKER (the default -- spelled out here deliberately, mirroring
-- the explicit `security definer` on fn_transition_job_status in 0010, so
-- the choice reads as intentional either way): every insert below runs as
-- the calling `authenticated` role under the caller's own auth.uid()
-- context, so it hits EXACTLY the same RLS INSERT policies
-- (customers_insert/properties_insert/solar_systems_insert/jobs_insert --
-- all `with check (fn_is_office_or_admin())`, see 0009) and the same
-- fn_stamp_attribution trigger (see 0015) as a manual create through the
-- pure insert functions would. SECURITY DEFINER is deliberately NOT used:
-- unlike job_status_history/job_events (which have no INSERT policy for any
-- client role and so require fn_transition_job_status to run as the
-- definer), every table this function writes to already grants INSERT to
-- `authenticated` under RLS -- there is no reason to run with elevated
-- privileges, and doing so would risk silently bypassing RLS if the
-- function-owning role has BYPASSRLS.
--
-- Each insert is wrapped in its own BEGIN/EXCEPTION block purely to tag the
-- error with which stage failed (INTAKE_STAGE:<stage>:<message>) for the
-- app layer to parse into a field-specific message -- catching and
-- re-raising does not change the atomicity guarantee above: the exception
-- still propagates out of this function and aborts the whole call.
create or replace function fn_create_intake_records(
  p_customer_id uuid,   -- non-null: reuse this existing customer as-is
  p_customer jsonb,     -- non-null: create a new customer from these fields
  p_property jsonb,
  p_solar_system jsonb, -- null: this job has no solar system
  p_job jsonb
)
returns table (
  customer_id uuid,
  property_id uuid,
  solar_system_id uuid,
  job_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_property_id uuid;
  v_solar_system_id uuid;
  v_job_id uuid;
begin
  if p_customer_id is null and p_customer is null then
    raise exception 'INTAKE_STAGE:customer:Customer information is required.';
  end if;
  if p_property is null then
    raise exception 'INTAKE_STAGE:property:Property information is required.';
  end if;
  if p_job is null then
    raise exception 'INTAKE_STAGE:job:Job information is required.';
  end if;

  -- Customer: reuse an existing row (must exist, and be visible to the
  -- caller under customers_select RLS -- a customer id the caller can't see
  -- is treated as not found rather than leaking its existence) or insert a
  -- new one.
  if p_customer_id is not null then
    begin
      select id into v_customer_id from customers where id = p_customer_id;
      if v_customer_id is null then
        raise exception 'Selected existing customer was not found.';
      end if;
    exception when others then
      raise exception 'INTAKE_STAGE:customer:%', sqlerrm;
    end;
  else
    begin
      insert into customers (first_name, last_name, email, phone, notes)
      values (
        p_customer->>'first_name',
        p_customer->>'last_name',
        nullif(p_customer->>'email', ''),
        nullif(p_customer->>'phone', ''),
        nullif(p_customer->>'notes', '')
      )
      returning id into v_customer_id;
    exception when others then
      raise exception 'INTAKE_STAGE:customer:%', sqlerrm;
    end;
  end if;

  -- Property: always attached to the customer resolved above -- the caller
  -- never supplies customer_id directly for this insert.
  begin
    insert into properties (
      customer_id, address_line1, address_line2, city, state, postal_code, country, notes
    )
    values (
      v_customer_id,
      p_property->>'address_line1',
      nullif(p_property->>'address_line2', ''),
      p_property->>'city',
      p_property->>'state',
      p_property->>'postal_code',
      coalesce(nullif(p_property->>'country', ''), 'US'),
      nullif(p_property->>'notes', '')
    )
    returning id into v_property_id;
  exception when others then
    raise exception 'INTAKE_STAGE:property:%', sqlerrm;
  end;

  -- Solar system: optional, always attached to the property just created.
  if p_solar_system is not null then
    begin
      insert into solar_systems (
        property_id, system_size_kw, panel_count, panel_manufacturer, panel_model,
        inverter_manufacturer, inverter_model, install_date, monitoring_platform,
        monitoring_system_id, notes
      )
      values (
        v_property_id,
        nullif(p_solar_system->>'system_size_kw', '')::numeric,
        nullif(p_solar_system->>'panel_count', '')::integer,
        nullif(p_solar_system->>'panel_manufacturer', ''),
        nullif(p_solar_system->>'panel_model', ''),
        nullif(p_solar_system->>'inverter_manufacturer', ''),
        nullif(p_solar_system->>'inverter_model', ''),
        nullif(p_solar_system->>'install_date', '')::date,
        nullif(p_solar_system->>'monitoring_platform', ''),
        nullif(p_solar_system->>'monitoring_system_id', ''),
        nullif(p_solar_system->>'notes', '')
      )
      returning id into v_solar_system_id;
    exception when others then
      raise exception 'INTAKE_STAGE:solar_system:%', sqlerrm;
    end;
  end if;

  -- Job: always attached to the property (and solar system, if any) just
  -- created above -- the caller never supplies property_id/solar_system_id
  -- directly for this insert either.
  begin
    insert into jobs (
      property_id, solar_system_id, job_type_id, priority, source, partner_id,
      title, description, appointment_date, appointment_start_time,
      appointment_end_time, appointment_window, assigned_crew_id,
      assigned_employee_id, scheduling_notes
    )
    values (
      v_property_id,
      v_solar_system_id,
      nullif(p_job->>'job_type_id', '')::uuid,
      coalesce(nullif(p_job->>'priority', ''), 'NORMAL'),
      nullif(p_job->>'source', ''),
      nullif(p_job->>'partner_id', '')::uuid,
      p_job->>'title',
      nullif(p_job->>'description', ''),
      nullif(p_job->>'appointment_date', '')::date,
      nullif(p_job->>'appointment_start_time', '')::time,
      nullif(p_job->>'appointment_end_time', '')::time,
      nullif(p_job->>'appointment_window', ''),
      nullif(p_job->>'assigned_crew_id', '')::uuid,
      nullif(p_job->>'assigned_employee_id', '')::uuid,
      nullif(p_job->>'scheduling_notes', '')
    )
    returning id into v_job_id;
  exception when others then
    raise exception 'INTAKE_STAGE:job:%', sqlerrm;
  end;

  return query select v_customer_id, v_property_id, v_solar_system_id, v_job_id;
end;
$$;

comment on function fn_create_intake_records is
  'AI Intake''s atomic multi-table create (Phase C). SECURITY INVOKER: every insert runs under the calling user''s own RLS/attribution, exactly like a manual create -- see src/server/intake/actions.ts. One RPC call = one Postgres transaction: any failure rolls back everything this call inserted.';

grant execute on function fn_create_intake_records(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
