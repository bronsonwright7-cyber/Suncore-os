-- Photos, documents, notes, customer communication log, and the generic
-- system-wide audit log.

create table photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  -- Path/key within the Supabase Storage bucket (see docs/DATABASE.md).
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  document_type text,
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  author_id uuid references profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table communications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  job_id uuid references jobs (id) on delete set null,
  channel text not null check (
    channel in ('phone', 'email', 'sms', 'in_person', 'other')
  ),
  direction text not null check (direction in ('inbound', 'outbound')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  logged_by uuid references profiles (id)
);

-- Generic, system-wide, low-level field-change record -- separate from
-- job_events (which is a curated, human-readable narrative). This is for
-- compliance/security/debugging, not a user-facing feed.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

comment on table audit_log is
  'Written only by fn_audit_trigger(). Readable only by Owner/Admin -- see 0009.';
