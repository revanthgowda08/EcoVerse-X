-- Security hardening, applied after connecting this schema to a live
-- Supabase project and running it through the project's security
-- advisor. Two real findings, both fixed here:
--
-- 1. None of the SECURITY DEFINER functions had an explicit
--    `search_path`, which is a known Postgres privilege-escalation
--    vector: a caller able to create an object (table/function) earlier
--    in an unpinned search_path can trick a SECURITY DEFINER function
--    into resolving to that object instead of the intended one, running
--    with the function owner's elevated privileges. Pinned every one to
--    `public, pg_temp` (pg_temp kept last and explicit, per Postgres's
--    own recommendation, rather than omitted).
--
-- 2. Every function in 0004_functions.sql was, by Postgres's default
--    grant-to-PUBLIC behavior, directly callable via the PostgREST RPC
--    endpoint by the `anon` and `authenticated` roles — including ones
--    never meant to be called directly at all:
--      - write_audit_log: meant to be called only internally by the
--        functions below it in the same file. Left exposed, any
--        authenticated user could insert fabricated audit_log rows
--        with an arbitrary actor_id and before/after payload, which
--        defeats the point of an audit trail.
--      - guard_mission_participation_review_fields,
--        prevent_self_role_escalation: trigger functions. Postgres
--        refuses to run these outside trigger context regardless, but
--        there's no reason to leave them in the public RPC surface.
--      - award_ecocoins: nothing in the shipped client calls this yet
--        (grepped — zero `supabase.rpc(...)` calls anywhere in src/).
--        More importantly, its body never ties p_user_id to auth.uid()
--        or verifies that p_source_id corresponds to a real, qualifying
--        event — only that the named reward_policy is active and that
--        (user, source_type, source_id) hasn't been used before. A
--        caller with EXECUTE could self-award unlimited EcoCoins by
--        calling it repeatedly with a fresh random source_id each time,
--        sidestepping the dedupe protection entirely since dedupe is
--        keyed on that same attacker-supplied value. Revoked until a
--        service-role path (e.g. an Edge Function, once the
--        admin-approval UI that should trigger this exists) calls it
--        after independently verifying the event — never client code
--        with a user-supplied source_id.
--      - review_ecocoins_entry: already checks is_admin() internally,
--        so it's not independently exploitable, but it's also unused by
--        any shipped UI yet — revoked for the same defense-in-depth
--        reason as the rest, pending the admin EcoCoins-review screen.
--    Left untouched: is_admin(), current_organization_id(),
--    is_org_admin_for() — these are read-only helpers that existing RLS
--    policies call directly inside USING/WITH CHECK expressions, which
--    Postgres evaluates with the querying role's own privileges even
--    for a SECURITY DEFINER function. Revoking EXECUTE on these would
--    make every policy that calls them error out with "permission
--    denied for function" for anon/authenticated, instead of correctly
--    filtering rows — breaking normal reads, not improving security.

alter function public.is_admin() set search_path = public, pg_temp;
alter function public.current_organization_id() set search_path = public, pg_temp;
alter function public.is_org_admin_for(uuid) set search_path = public, pg_temp;
alter function public.award_ecocoins(uuid, uuid, text, uuid) set search_path = public, pg_temp;
alter function public.review_ecocoins_entry(uuid, boolean) set search_path = public, pg_temp;
alter function public.write_audit_log(uuid, text, text, text, jsonb, jsonb) set search_path = public, pg_temp;
alter function public.prevent_self_role_escalation() set search_path = public, pg_temp;
alter function public.guard_mission_participation_review_fields() set search_path = public, pg_temp;

-- Revoke from PUBLIC, not just the named roles: Postgres grants EXECUTE
-- on every new function to the PUBLIC pseudo-role by default at create
-- time, and every role (including anon/authenticated) implicitly
-- inherits PUBLIC's grants. Revoking only from the named roles leaves
-- that standing PUBLIC grant in effect and changes nothing — confirmed
-- the hard way, by checking has_function_privilege() after an initial
-- `revoke ... from anon, authenticated` attempt and finding both still
-- true. Revoking from PUBLIC is the actual fix.
revoke execute on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb) from public;
revoke execute on function public.award_ecocoins(uuid, uuid, text, uuid) from public;
revoke execute on function public.review_ecocoins_entry(uuid, boolean) from public;
revoke execute on function public.prevent_self_role_escalation() from public;
revoke execute on function public.guard_mission_participation_review_fields() from public;
