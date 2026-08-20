-- Suncore OS: extensions and generic helper functions used across the schema.

create extension if not exists "pgcrypto";

-- Generic "touch updated_at on write" trigger, attached to every table that
-- has an updated_at column (see 0008_triggers.sql).
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
