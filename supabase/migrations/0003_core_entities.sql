-- Core business entities: customers, properties, solar systems, partners,
-- job types, employees, crews, and time-bounded crew membership.

create table customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

create table solar_systems (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  system_size_kw numeric(6, 2),
  panel_count integer,
  panel_manufacturer text,
  panel_model text,
  inverter_manufacturer text,
  inverter_model text,
  install_date date,
  monitoring_platform text,
  monitoring_system_id text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

-- Partner companies (roofing partners, solar companies, etc.) that jobs can
-- originate from. Kept as a real table (not free text on jobs) so partner
-- volume/performance can be reported on later.
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_type text not null check (
    partner_type in ('roofing_partner', 'solar_company', 'other')
  ),
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

-- Lookup table for job types (Install, Repair, Maintenance, ...). Unlike the
-- categorical fields on `jobs` (priority, source, payment_status) which are
-- text + CHECK constraints, job types are a real table because they carry
-- their own descriptive metadata and are expected to be managed by Office/Admin.
create table job_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: not every employee has a login (e.g. temp/contract labor).
  profile_id uuid references profiles (id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  -- Trade/role on the crew (e.g. "Lead Electrician"). Distinct from
  -- profiles.role, which is the *system access level* (Admin/Office/Crew/QA).
  job_title text,
  employee_type text not null default 'EMPLOYEE' check (
    employee_type in ('EMPLOYEE', 'CONTRACTOR', 'SUBCONTRACTOR')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id),
  unique (profile_id)
);

create table crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

-- Time-bounded crew membership: an employee's tenure on a crew, so historical
-- jobs still reflect who was actually on the crew at the time, even after
-- crew rosters change.
create table crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  role_in_crew text not null default 'MEMBER' check (
    role_in_crew in ('LEAD', 'MEMBER')
  ),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id),
  check (end_date is null or end_date >= start_date)
);

-- An employee can only have one *active* (end_date is null) membership in a
-- given crew at a time.
create unique index crew_members_active_unique
  on crew_members (crew_id, employee_id)
  where (end_date is null);
