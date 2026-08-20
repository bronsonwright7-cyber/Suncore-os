-- profiles: 1:1 extension of auth.users, holding the app-level role.
--
-- role is intentionally nullable. A new signup has no role (and therefore no
-- access to anything beyond their own profile row) until an Owner/Admin
-- explicitly assigns one. This is a deliberate default-deny posture.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text check (
    role in ('OWNER', 'ADMIN', 'OFFICE', 'CREW_LEAD', 'CREW_MEMBER', 'QA')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is
  'App-level profile + role for each authenticated user. role = null means no access yet.';

-- Automatically create a profile row whenever a new auth user signs up.
create or replace function fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', null)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function fn_handle_new_user();
