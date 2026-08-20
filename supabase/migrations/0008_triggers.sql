-- Attach the generic updated_at trigger to every table that has the column.

create trigger trg_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on customers
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on properties
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on solar_systems
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on partners
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on job_types
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on employees
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on crews
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on crew_members
  for each row execute function set_updated_at();
create trigger trg_set_updated_at before update on jobs
  for each row execute function set_updated_at();

-- Generic system-wide audit log. Runs as the function owner (postgres),
-- which is how it can write to audit_log even though no client role is ever
-- granted INSERT on it (see 0009_rls_functions_and_policies.sql).
create or replace function fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into audit_log (table_name, record_id, action, changed_by, new_data)
    values (tg_table_name, new.id, 'INSERT', v_actor, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into audit_log (table_name, record_id, action, changed_by, old_data, new_data)
    values (tg_table_name, new.id, 'UPDATE', v_actor, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_log (table_name, record_id, action, changed_by, old_data)
    values (tg_table_name, old.id, 'DELETE', v_actor, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_audit after insert or update or delete on customers
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on properties
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on solar_systems
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on partners
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on employees
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on crews
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on crew_members
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on jobs
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on job_types
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on job_assignments
  for each row execute function fn_audit_trigger();
create trigger trg_audit after insert or update or delete on profiles
  for each row execute function fn_audit_trigger();

-- ---------------------------------------------------------------------------
-- Automatic job_events logging. These run as the function owner (postgres),
-- so job_events stays complete and consistent without relying on every
-- application code path remembering to log an event.
-- ---------------------------------------------------------------------------

create or replace function fn_log_job_created_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into job_status_history (job_id, from_status, to_status, changed_by, reason)
  values (new.id, null, new.status, new.created_by, 'Job created');

  insert into job_events (job_id, event_type, actor_id, summary, event_data)
  values (new.id, 'created', new.created_by, 'Job created', jsonb_build_object('status', new.status));

  return new;
end;
$$;

create trigger trg_log_job_created_event after insert on jobs
  for each row execute function fn_log_job_created_event();

-- Detects edits to scheduling/assignment fields made via a normal UPDATE
-- (by Office/Admin) and logs the corresponding timeline event. Status
-- changes are logged separately by fn_transition_job_status() (see 0010).
create or replace function fn_log_job_update_events()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := coalesce(new.updated_by, auth.uid());
begin
  if new.appointment_date is distinct from old.appointment_date
     or new.appointment_start_time is distinct from old.appointment_start_time
     or new.appointment_end_time is distinct from old.appointment_end_time
     or new.appointment_window is distinct from old.appointment_window then
    insert into job_events (job_id, event_type, actor_id, summary, event_data)
    values (
      new.id,
      case when old.appointment_date is null then 'scheduled' else 'rescheduled' end,
      v_actor,
      case when old.appointment_date is null then 'Job scheduled' else 'Job rescheduled' end,
      jsonb_build_object(
        'old_date', old.appointment_date, 'new_date', new.appointment_date,
        'old_start', old.appointment_start_time, 'new_start', new.appointment_start_time,
        'old_end', old.appointment_end_time, 'new_end', new.appointment_end_time,
        'old_window', old.appointment_window, 'new_window', new.appointment_window
      )
    );
  end if;

  if new.assigned_crew_id is distinct from old.assigned_crew_id
     or new.assigned_employee_id is distinct from old.assigned_employee_id then
    insert into job_events (job_id, event_type, actor_id, summary, event_data)
    values (
      new.id,
      case
        when old.assigned_crew_id is null and old.assigned_employee_id is null
        then 'assigned' else 'reassigned'
      end,
      v_actor,
      case
        when old.assigned_crew_id is null and old.assigned_employee_id is null
        then 'Crew assigned' else 'Crew reassigned'
      end,
      jsonb_build_object(
        'old_crew_id', old.assigned_crew_id, 'new_crew_id', new.assigned_crew_id,
        'old_employee_id', old.assigned_employee_id, 'new_employee_id', new.assigned_employee_id
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_log_job_update_events after update on jobs
  for each row execute function fn_log_job_update_events();

create or replace function fn_log_photo_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into job_events (job_id, event_type, actor_id, summary, event_data)
  values (new.job_id, 'photo_uploaded', new.uploaded_by, 'Photo uploaded', jsonb_build_object('photo_id', new.id));
  return new;
end;
$$;

create trigger trg_log_photo_event after insert on photos
  for each row execute function fn_log_photo_event();

create or replace function fn_log_document_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into job_events (job_id, event_type, actor_id, summary, event_data)
  values (new.job_id, 'document_added', new.uploaded_by, 'Document added', jsonb_build_object('document_id', new.id, 'file_name', new.file_name));
  return new;
end;
$$;

create trigger trg_log_document_event after insert on documents
  for each row execute function fn_log_document_event();

create or replace function fn_log_note_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into job_events (job_id, event_type, actor_id, summary, event_data)
  values (new.job_id, 'note_added', new.author_id, 'Note added', jsonb_build_object('note_id', new.id));
  return new;
end;
$$;

create trigger trg_log_note_event after insert on notes
  for each row execute function fn_log_note_event();
