-- Give admins a real "who signed up" view, and close a role-escalation
-- gap noticed while building it.
--
-- 1. `profiles` never stored email or a signup display name — both live
--    only on `auth.users`, which client code can't query (no schema
--    grant), so the admin UI had nothing to list. Denormalize both onto
--    `profiles` at signup time, the same SECURITY DEFINER trigger path
--    0006 already uses for the row itself.
-- 2. The existing "users can update their own profile (not their role)"
--    policy's name overstates what it does: `with check (id = auth.uid())`
--    only confirms row ownership, not which columns changed — a
--    signed-in user could already set their own `role` to 'admin' via a
--    plain client-side update. 0002's comment flagged this as pending
--    ("added in a follow-up migration alongside the rest of the admin
--    tooling") — this is that migration. A BEFORE UPDATE trigger rejects
--    any role change made by a non-admin, regardless of which policy
--    let the UPDATE through.
-- 3. Admins also need to update *other* users' profiles (role changes
--    from the new admin UI) — add that policy; the self-update policy
--    stays for users editing their own display_name.

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

create or replace function prevent_role_self_escalation() returns trigger as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an admin can change a profile''s role.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_profile_role_change on profiles;
create trigger on_profile_role_change
  before update on profiles
  for each row execute function prevent_role_self_escalation();

revoke execute on function prevent_role_self_escalation() from public;
revoke execute on function prevent_role_self_escalation() from anon, authenticated;

create policy "admins can update any profile"
  on profiles for update
  using (is_admin())
  with check (is_admin());
