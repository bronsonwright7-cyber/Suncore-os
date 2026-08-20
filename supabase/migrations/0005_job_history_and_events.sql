-- job_status_history: strict, append-only audit trail of status transitions.
-- Used to enforce/validate the state machine and answer "when did this job
-- reach status X".
create table job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now(),
  reason text
);

comment on table job_status_history is
  'Append-only. Written only by fn_transition_job_status() / fn_log_job_created_event() -- never directly by clients.';

-- job_events: the broader chronological timeline/activity feed for a job.
-- Superset of job_status_history (status changes are logged here too, as
-- 'status_changed') plus non-status activity (photos, reschedules, notes,
-- QA decisions). This is the intended foundation for the future AI
-- operations assistant to reason over ("summarize this job", "what's stalled").
create table job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created', 'scheduled', 'rescheduled', 'assigned', 'reassigned',
      'crew_en_route', 'arrived', 'work_started', 'photo_uploaded',
      'document_added', 'note_added', 'work_completed', 'submitted_for_qa',
      'qa_approved', 'qa_rejected', 'closed', 'status_changed',
      'communication_logged'
    )
  ),
  actor_id uuid references profiles (id),
  occurred_at timestamptz not null default now(),
  summary text not null,
  event_data jsonb not null default '{}'::jsonb
);

comment on table job_events is
  'Append-only narrative timeline. Written only by trusted trigger functions -- never directly by clients.';

-- job_assignments: many-to-many job <-> employee, for recording every crew
-- member who participated (beyond the single "primary" assigned_crew_id /
-- assigned_employee_id on jobs, which drive scheduling/dispatch).
create table job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  crew_id uuid references crews (id),
  assigned_role text not null default 'MEMBER' check (
    assigned_role in ('LEAD', 'MEMBER')
  ),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  created_by uuid references profiles (id)
);

-- An employee can only be *actively* assigned (unassigned_at is null) to a
-- given job once.
create unique index job_assignments_active_unique
  on job_assignments (job_id, employee_id)
  where (unassigned_at is null);
