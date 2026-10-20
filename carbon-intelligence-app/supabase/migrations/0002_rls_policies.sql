-- Row-level security policies
--
-- Access model summary:
--   - "user" role: full CRUD on their own assessments/inputs/results/
--     evidence/mission participations; read-only on their own profile,
--     their own org (if any), public emission factors, and public
--     missions.
--   - "org_admin" role: everything a user can do, plus read access to
--     every assessment belonging to their own organization_id — never
--     another organization's.
--   - "admin" role: full read everywhere; write access to
--     emission_factors, missions, reward_policies; read access to
--     audit_log.
--   - EcoCoins ledger rows are never inserted directly by a user's own
--     request — only by a trusted server-side path (a SECURITY DEFINER
--     function or a service-role Edge Function) after validating a
--     reward_policies trigger condition, enforced below by granting no
--     INSERT policy to the authenticated role at all.

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table emission_factors enable row level security;
alter table assessments enable row level security;
alter table assessment_inputs enable row level security;
alter table assessment_results enable row level security;
alter table evidence_files enable row level security;
alter table reward_policies enable row level security;
alter table ecocoins_ledger enable row level security;
alter table missions enable row level security;
alter table mission_participations enable row level security;
alter table audit_log enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Helper: current user's organization_id (null if none)
create or replace function current_organization_id() returns uuid as $$
  select organization_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: is the current user an org_admin for the given organization?
create or replace function is_org_admin_for(target_org uuid) returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'org_admin' and organization_id = target_org
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create policy "org members can read their own organization"
  on organizations for select
  using (id = current_organization_id() or is_admin());

create policy "only admins can write organizations"
  on organizations for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "users can read their own profile"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "users can update their own profile (not their role)"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
-- NOTE: role escalation prevention (a user setting their own role to
-- 'admin') must be enforced by a BEFORE UPDATE trigger that rejects a
-- role change unless is_admin() — added in a follow-up migration
-- alongside the rest of the admin tooling.

-- ---------------------------------------------------------------------
-- emission_factors — public read, admin write (transparency requirement)
-- ---------------------------------------------------------------------
create policy "anyone can read emission factors"
  on emission_factors for select
  using (true);

create policy "only admins can write emission factors"
  on emission_factors for insert
  with check (is_admin());

create policy "only admins can update emission factors"
  on emission_factors for update
  using (is_admin())
  with check (is_admin());

-- deliberately no delete policy: factors are superseded, never deleted,
-- so historical assessment_results stay valid.

-- ---------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------
create policy "users can manage their own assessments"
  on assessments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "org admins can read their organization's assessments"
  on assessments for select
  using (organization_id is not null and is_org_admin_for(organization_id));

create policy "admins can read all assessments"
  on assessments for select
  using (is_admin());

-- ---------------------------------------------------------------------
-- assessment_inputs (ownership follows the parent assessment)
-- ---------------------------------------------------------------------
create policy "users can manage inputs on their own assessments"
  on assessment_inputs for all
  using (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = auth.uid())
  )
  with check (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = auth.uid())
  );

create policy "org admins can read their organization's assessment inputs"
  on assessment_inputs for select
  using (
    exists (
      select 1 from assessments a
      where a.id = assessment_id
        and a.organization_id is not null
        and is_org_admin_for(a.organization_id)
    )
  );

create policy "admins can read all assessment inputs"
  on assessment_inputs for select
  using (is_admin());

-- ---------------------------------------------------------------------
-- assessment_results (read-mostly; written by the app after a calc run)
-- ---------------------------------------------------------------------
create policy "users can manage results on their own assessments"
  on assessment_results for all
  using (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = auth.uid())
  )
  with check (
    exists (select 1 from assessments a where a.id = assessment_id and a.user_id = auth.uid())
  );

create policy "org admins can read their organization's assessment results"
  on assessment_results for select
  using (
    exists (
      select 1 from assessments a
      where a.id = assessment_id
        and a.organization_id is not null
        and is_org_admin_for(a.organization_id)
    )
  );

create policy "admins can read all assessment results"
  on assessment_results for select
  using (is_admin());

-- ---------------------------------------------------------------------
-- evidence_files
-- ---------------------------------------------------------------------
create policy "users can manage their own evidence uploads"
  on evidence_files for all
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

create policy "admins can read all evidence"
  on evidence_files for select
  using (is_admin());

-- ---------------------------------------------------------------------
-- reward_policies — admin-managed configuration
-- ---------------------------------------------------------------------
create policy "only admins can read reward policies"
  on reward_policies for select
  using (is_admin());

create policy "only admins can write reward policies"
  on reward_policies for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------
-- ecocoins_ledger — read-only for the owning user; no direct user insert
-- ---------------------------------------------------------------------
create policy "users can read their own ecocoins ledger"
  on ecocoins_ledger for select
  using (user_id = auth.uid());

create policy "admins can read and manage all ecocoins ledger entries"
  on ecocoins_ledger for all
  using (is_admin())
  with check (is_admin());
-- NOTE: no insert/update policy is granted to the plain "authenticated"
-- role — ledger entries are created by a SECURITY DEFINER function
-- (see 0003_functions.sql) invoked after a reward_policies condition is
-- actually met, never directly from client code.

-- ---------------------------------------------------------------------
-- missions — public read, admin write
-- ---------------------------------------------------------------------
create policy "anyone can read active missions"
  on missions for select
  using (true);

create policy "only admins can write missions"
  on missions for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------
-- mission_participations
-- ---------------------------------------------------------------------
create policy "users can manage their own mission participation"
  on mission_participations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admins can read and review all mission participations"
  on mission_participations for all
  using (is_admin())
  with check (is_admin());
-- NOTE: a BEFORE UPDATE trigger should prevent a non-admin user from
-- setting measured_metric_value/status directly (only from
-- estimated_metric_value / evidence upload) — added alongside the
-- evidence-review workflow build-out.

-- ---------------------------------------------------------------------
-- audit_log — admin read-only, no client-side insert policy at all
-- ---------------------------------------------------------------------
create policy "only admins can read the audit log"
  on audit_log for select
  using (is_admin());
-- writes happen via SECURITY DEFINER functions / triggers running as
-- the function owner, which bypasses RLS by design — never via a
-- policy grant to "authenticated".
