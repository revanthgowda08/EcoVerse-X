-- Auto-create a profiles row for every new auth.users signup.
--
-- Found while connecting this schema to a live Supabase project and
-- tracing the actual sign-up path end to end: authStore.tsx's `signUp`
-- only calls `supabase.auth.signUp(...)` — nothing ever inserted a
-- matching `profiles` row. Every other table that matters
-- (assessments, assessment_results, ecocoins_ledger, ...) has a NOT
-- NULL foreign key to `profiles.id`, so without this, every real user
-- who ever signed up would hit a foreign-key violation the first time
-- they tried to save an assessment — the core feature "save your
-- assessment to come back to it later" was silently broken for 100% of
-- new users, not an edge case.
--
-- This can't be fixed client-side either: `profiles` has no INSERT
-- policy for the `authenticated` role at all (only SELECT and UPDATE),
-- so a client-side "insert my own profile row after signing up" call
-- would be rejected by RLS regardless. A SECURITY DEFINER trigger on
-- auth.users is the standard Supabase pattern for exactly this, and the
-- only approach that's atomic with account creation — not dependent on
-- the client staying online long enough to make a second request after
-- signUp() resolves.

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Trigger functions are never meant to be called directly — see the
-- same reasoning in 0005_security_hardening.sql for the other two.
-- Both layers, same lesson learned there: the implicit PUBLIC grant
-- every new function gets by default, AND Supabase's own default
-- privilege rule that separately grants anon/authenticated directly.
revoke execute on function handle_new_user() from public;
revoke execute on function handle_new_user() from anon, authenticated;
