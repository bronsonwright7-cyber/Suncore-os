-- Multiple phone numbers per customer (Phase 1: database + manual create/
-- edit/view only -- AI Intake is untouched in this phase and continues to
-- read/write the single customers.phone column exactly as before).
--
-- customers.phone is kept, NOT dropped, and is kept in sync with whichever
-- row below is the customer's primary phone (via fn_sync_customer_primary_phone,
-- an AFTER trigger on this table) -- every existing read path that already
-- searches/displays customers.phone (listCustomers' search filter, the
-- customers list table column, AI Intake's duplicate check and extraction)
-- keeps working unmodified.

create table customer_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  phone_number text not null,
  phone_type text not null default 'mobile' check (
    phone_type in ('mobile', 'home', 'work', 'other')
  ),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

create index customer_phone_numbers_customer_id_idx
  on customer_phone_numbers (customer_id);

-- At most one primary phone per customer -- same idiom already used for
-- "only one active X at a time" (crew_members_active_unique,
-- job_assignments_active_unique in 0003/0005).
create unique index customer_phone_numbers_primary_unique
  on customer_phone_numbers (customer_id)
  where (is_primary);

-- ---------------------------------------------------------------------------
-- Row Level Security: identical shape to properties_* (0009) -- same
-- customer-visibility rule (fn_can_read_broadly() or job-assigned via the
-- customer's properties/jobs), same fn_is_office_or_admin() write gate as
-- customers_insert/customers_update. A delete policy is included (mirroring
-- crew_members_delete) because replacing a customer's phone list requires
-- deleting the old rows.
-- ---------------------------------------------------------------------------

alter table customer_phone_numbers enable row level security;

create policy customer_phone_numbers_select on customer_phone_numbers for select
  using (
    fn_can_read_broadly()
    or exists (
      select 1 from properties p
      join jobs j on j.property_id = p.id
      where p.customer_id = customer_phone_numbers.customer_id and fn_is_assigned_to_job(j.id)
    )
  );
create policy customer_phone_numbers_insert on customer_phone_numbers for insert
  with check (fn_is_office_or_admin());
create policy customer_phone_numbers_update on customer_phone_numbers for update
  using (fn_is_office_or_admin()) with check (fn_is_office_or_admin());
create policy customer_phone_numbers_delete on customer_phone_numbers for delete
  using (fn_is_office_or_admin());

-- Attribution + updated_at: reuse the existing generic trigger functions
-- (set_updated_at from 0001, fn_stamp_attribution from 0015) -- no new
-- attribution logic, this table follows the same convention as every other
-- customer-owned table.
create trigger trg_set_updated_at before update on customer_phone_numbers
  for each row execute function set_updated_at();
create trigger trg_stamp_attribution before insert or update on customer_phone_numbers
  for each row execute function fn_stamp_attribution();

-- ---------------------------------------------------------------------------
-- Invariant: "exactly one primary phone when the customer has at least one
-- phone number" -- the partial unique index above only guarantees "at most
-- one"; these two triggers guarantee "at least one stays true" too, so the
-- invariant holds regardless of which write path touches this table (the
-- new fn_replace_customer_phone_numbers RPC below, or any future direct
-- write by an Office/Admin user, since RLS permits that exactly like every
-- other table in this schema).
-- ---------------------------------------------------------------------------

create or replace function fn_maintain_customer_phone_primary()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Marking a row primary demotes whichever other row (if any) currently
  -- holds it -- lets a single INSERT/UPDATE "move" primary status without
  -- the caller having to demote the old one in a separate statement.
  if new.is_primary then
    update customer_phone_numbers
      set is_primary = false
      where customer_id = new.customer_id and id <> new.id and is_primary;
  elsif not exists (
    select 1 from customer_phone_numbers
    where customer_id = new.customer_id and id <> new.id
  ) then
    -- Would be the customer's only row -- can't be left non-primary (zero
    -- primaries for a customer who has a phone number).
    new.is_primary := true;
  elsif tg_op = 'UPDATE' and old.is_primary then
    -- Demoting the current primary while other rows exist -- promote the
    -- oldest other row so the customer is never left with zero primaries.
    update customer_phone_numbers
      set is_primary = true
      where id = (
        select id from customer_phone_numbers
        where customer_id = new.customer_id and id <> new.id
        order by created_at asc
        limit 1
      );
  end if;

  return new;
end;
$$;

create trigger trg_maintain_customer_phone_primary
before insert or update on customer_phone_numbers
for each row execute function fn_maintain_customer_phone_primary();

create or replace function fn_promote_customer_phone_primary_on_delete()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.is_primary then
    update customer_phone_numbers
      set is_primary = true
      where id = (
        select id from customer_phone_numbers
        where customer_id = old.customer_id
        order by created_at asc
        limit 1
      );
  end if;

  return old;
end;
$$;

create trigger trg_promote_customer_phone_primary_on_delete
after delete on customer_phone_numbers
for each row execute function fn_promote_customer_phone_primary_on_delete();

-- Keeps customers.phone mirroring the current primary number (or NULL when
-- a customer has none) for any write to this table, from any path.
create or replace function fn_sync_customer_primary_phone()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := coalesce(new.customer_id, old.customer_id);
  v_primary_phone text;
begin
  select phone_number into v_primary_phone
  from customer_phone_numbers
  where customer_id = v_customer_id and is_primary
  limit 1;

  update customers
    set phone = v_primary_phone
    where id = v_customer_id and phone is distinct from v_primary_phone;

  return null;
end;
$$;

create trigger trg_sync_customer_primary_phone
after insert or update or delete on customer_phone_numbers
for each row execute function fn_sync_customer_primary_phone();

-- ---------------------------------------------------------------------------
-- Backfill: every existing customer with a phone gets one mobile/primary
-- row, in the same migration that creates the "exactly one primary"
-- constraint -- pre-existing data satisfies it immediately. This also
-- exercises the triggers above (each backfilled row re-syncs
-- customers.phone to the same value it already had -- a harmless no-op
-- write, since the value is unchanged).
-- ---------------------------------------------------------------------------

insert into customer_phone_numbers (customer_id, phone_number, phone_type, is_primary)
select id, phone, 'mobile', true
from customers
where phone is not null and trim(phone) <> '';

-- ---------------------------------------------------------------------------
-- fn_replace_customer_phone_numbers: atomically replaces a customer's whole
-- phone list (the manual customer form always submits the full set, not an
-- incremental diff). SECURITY INVOKER: runs as the calling `authenticated`
-- role, so it hits the exact same RLS insert/delete policies above as a
-- direct write would -- no elevated access, no service-role key. A single
-- RPC call is one Postgres transaction, so a failure partway through
-- (e.g. a malformed phone_type) rolls back the whole replace -- the
-- customer is never left with a partial/mismatched phone list.
-- ---------------------------------------------------------------------------
create or replace function fn_replace_customer_phone_numbers(
  p_customer_id uuid,
  p_phones jsonb -- array of {phone_number, phone_type, is_primary}
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_phone jsonb;
begin
  delete from customer_phone_numbers where customer_id = p_customer_id;

  for v_phone in select * from jsonb_array_elements(coalesce(p_phones, '[]'::jsonb))
  loop
    insert into customer_phone_numbers (customer_id, phone_number, phone_type, is_primary)
    values (
      p_customer_id,
      v_phone->>'phone_number',
      coalesce(nullif(v_phone->>'phone_type', ''), 'mobile'),
      coalesce((v_phone->>'is_primary')::boolean, false)
    );
  end loop;
end;
$$;

comment on function fn_replace_customer_phone_numbers is
  'Atomically replaces a customer''s full phone number list (Phase 1 of multi-phone CRM support). SECURITY INVOKER -- see src/server/customers/actions.ts (replaceCustomerPhoneNumbers) for the calling convention.';

grant execute on function fn_replace_customer_phone_numbers(uuid, jsonb) to authenticated;
