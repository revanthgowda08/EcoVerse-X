-- Give admins a real "who signed up" view.
--
-- `profiles` never stored email or a signup display name — both live
-- only on `auth.users`, which client code can't query (no schema
-- grant), so the admin UI had nothing to list. Denormalize both onto
-- `profiles` at signup time, the same SECURITY DEFINER trigger path
-- 0006 already uses for the row itself, with a backfill for rows
-- created before this column existed.
--
-- Admins also need to update *other* users' profiles (role changes
-- from the new admin UI) — add that policy; the existing self-update
-- policy stays for users editing their own display_name. Role-change
-- protection itself doesn't need touching here: 0004_functions.sql
-- already put a BEFORE UPDATE trigger (prevent_self_role_escalation)
-- on profiles blocking a non-admin from changing their own role or
-- organization_id — confirmed live via pg_trigger before writing this,
-- after an earlier version of this migration mistakenly added a second,
-- less complete copy of that same protection.

alter table profiles add column if not exists email text;

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Backfill existing rows created before this column existed.
update profiles
set email = auth_users.email
from auth.users as auth_users
where profiles.id = auth_users.id
  and profiles.email is null;

create policy "admins can update any profile"
  on profiles for update
  using (is_admin())
  with check (is_admin());
