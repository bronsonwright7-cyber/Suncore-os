-- The single trusted path for changing a job's status. Enforces the state
-- machine, enforces who is allowed to make a given transition, and writes
-- jobs.status + job_status_history + job_events atomically (all three writes
-- happen inside one function call, i.e. one transaction).
--
-- Direct UPDATE of jobs.status is revoked from `authenticated` in 0009, so
-- this function -- owned by the migration role and therefore bypassing
-- RLS/grants as the table owner -- is the only way to change it, for every
-- role including Owner/Admin.
create or replace function fn_transition_job_status(
  p_job_id uuid,
  p_to_status text,
  p_reason text default null
)
returns jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_status text;
  v_actor uuid := auth.uid();
  v_role text := fn_current_role();
  v_event_type text;
  v_summary text;
  v_job jobs%rowtype;
begin
  select status into v_old_status from jobs where id = p_job_id for update;

  if not found then
    raise exception 'Job % not found', p_job_id;
  end if;

  -- Authorization: which roles may perform this specific transition.
  if v_role in ('OWNER', 'ADMIN', 'OFFICE') then
    null; -- may drive any legal transition
  elsif v_role = 'QA' then
    if not (v_old_status = 'QA' and p_to_status in ('CLOSED', 'IN_PROGRESS')) then
      raise exception
        'QA reviewers may only approve (CLOSED) or reject (IN_PROGRESS) a job that is currently in QA.';
    end if;
  elsif v_role in ('CREW_LEAD', 'CREW_MEMBER') then
    if not fn_is_assigned_to_job(p_job_id) then
      raise exception 'You are not assigned to this job.';
    end if;
    if p_to_status not in ('CREW_EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED') then
      raise exception 'Crew members may not set job status to %.', p_to_status;
    end if;
  else
    raise exception 'You do not have permission to change job status.';
  end if;

  -- The transition itself must be a legal move in the state machine.
  if not exists (
    select 1 from job_status_transitions t
    where t.from_status = v_old_status and t.to_status = p_to_status
  ) then
    raise exception 'Cannot transition a job from % to %.', v_old_status, p_to_status;
  end if;

  update jobs
    set status = p_to_status, updated_at = now(), updated_by = v_actor
    where id = p_job_id
    returning * into v_job;

  insert into job_status_history (job_id, from_status, to_status, changed_by, reason)
  values (p_job_id, v_old_status, p_to_status, v_actor, p_reason);

  v_event_type := case
    when p_to_status = 'QA' and v_old_status = 'COMPLETED' then 'submitted_for_qa'
    when p_to_status = 'CLOSED' then 'qa_approved'
    when p_to_status = 'IN_PROGRESS' and v_old_status = 'QA' then 'qa_rejected'
    when p_to_status = 'CREW_EN_ROUTE' then 'crew_en_route'
    when p_to_status = 'ON_SITE' then 'arrived'
    when p_to_status = 'IN_PROGRESS' then 'work_started'
    when p_to_status = 'COMPLETED' then 'work_completed'
    when p_to_status = 'SCHEDULED' then 'scheduled'
    when p_to_status = 'ASSIGNED' then 'assigned'
    else 'status_changed'
  end;

  v_summary := format('Status changed from %s to %s', v_old_status, p_to_status);
  if p_reason is not null then
    v_summary := v_summary || format(' (%s)', p_reason);
  end if;

  insert into job_events (job_id, event_type, actor_id, summary, event_data)
  values (
    p_job_id, v_event_type, v_actor, v_summary,
    jsonb_build_object('from_status', v_old_status, 'to_status', p_to_status, 'reason', p_reason)
  );

  return v_job;
end;
$$;

grant execute on function fn_transition_job_status(uuid, text, text) to authenticated;
