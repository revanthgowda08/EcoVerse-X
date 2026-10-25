-- Performance hardening, applied after running this project through
-- Supabase's own performance advisor post-connection. Two of its
-- findings are genuine and safe to fix outright; a third is
-- deliberately left as a documented, deferred trade-off:
--
-- 1. auth_rls_initplan (WARN, 8 policies): every RLS policy that calls
--    auth.uid() directly makes Postgres re-evaluate that call for every
--    row the query touches, instead of once per query. Wrapping it as
--    `(select auth.uid())` is semantically identical (Postgres can then
--    treat it as a stable sub-plan, evaluated once) and is Supabase's
--    own documented fix for this exact finding. Applied to every
--    affected policy below by dropping and recreating it verbatim with
--    only that one change.
--
-- 2. unindexed_foreign_keys (INFO, 10 columns): every foreign key below
--    had no covering index, which matters once these tables hold real
--    rows and a delete/update on the referenced side has to scan the
--    referencing table. Pure additive indexes, no behavior change.
--
-- NOT fixed here: multiple_permissive_policies (WARN, ~60 findings,
-- really ~12 distinct cases multiplied across Postgres's internal
-- roles). Several tables have an owner-scoped `for all` policy plus a
-- separate admin/org-admin `for select` policy, which Postgres
-- evaluates as separate permissive policies OR'd together rather than
-- one combined policy — correct, just not maximally efficient at high
-- query volume. Consolidating each pair into a single policy means
-- splitting every `for all` policy into per-command policies first (so
-- the select variant can merge with the admin one while insert/update/
-- delete stay owner-only), which is real surgery on the access-control
-- model across 8 tables. Deferred rather than risked without a way to
-- browser-test the result end to end in this environment — see the
-- README's infrastructure notes.
--
-- Also unaddressed: unused_index (INFO, 10 indexes) — expected noise
-- for a brand-new project with no query history yet, not a real
-- problem; these are exactly the columns the application's own queries
-- filter on (user_id, assessment_id, etc.) and will show as used once
-- real traffic exists.

-- --- auth_rls_initplan ---

drop policy "users can read their own profile" on profiles;
create policy "users can read their own profile"
  on profiles for select
  using (id = (select auth.uid()) or is_admin());

drop policy "users can update their own profile (not their role)" on profiles;
create policy "users can update their own profile (not their role)"
  on profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy "users can manage their own assessments" on assessments;
create policy "users can manage their own assessments"
  on assessments for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "users can manage inputs on their own assessments" on assessment_inputs;
create policy "users can manage inputs on their own assessments"
  on assessment_inputs for all
  using (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = (select auth.uid()))
  );

drop policy "users can manage results on their own assessments" on assessment_results;
create policy "users can manage results on their own assessments"
  on assessment_results for all
  using (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = (select auth.uid()))
  );

drop policy "users can manage their own evidence uploads" on evidence_files;
create policy "users can manage their own evidence uploads"
  on evidence_files for all
  using (uploaded_by = (select auth.uid()))
  with check (uploaded_by = (select auth.uid()));

drop policy "users can read their own ecocoins ledger" on ecocoins_ledger;
create policy "users can read their own ecocoins ledger"
  on ecocoins_ledger for select
  using (user_id = (select auth.uid()));

drop policy "users can manage their own mission participation" on mission_participations;
create policy "users can manage their own mission participation"
  on mission_participations for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- --- unindexed_foreign_keys ---

create index if not exists idx_audit_log_actor on audit_log (actor_id);
create index if not exists idx_ecocoins_ledger_reviewed_by on ecocoins_ledger (reviewed_by);
create index if not exists idx_ecocoins_ledger_reward_policy on ecocoins_ledger (reward_policy_id);
create index if not exists idx_emission_factors_created_by on emission_factors (created_by);
create index if not exists idx_emission_factors_supersedes on emission_factors (supersedes);
create index if not exists idx_evidence_files_uploaded_by on evidence_files (uploaded_by);
create index if not exists idx_mission_participations_reviewed_by on mission_participations (reviewed_by);
create index if not exists idx_missions_created_by on missions (created_by);
create index if not exists idx_profiles_organization on profiles (organization_id);
create index if not exists idx_reward_policies_created_by on reward_policies (created_by);
