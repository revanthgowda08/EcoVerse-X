-- Ecoverse Carbon Intelligence — initial schema
--
-- Design principles this schema exists to enforce:
--   1. Every calculated number must be traceable to the inputs and the
--      exact factor version that produced it (assessment_results stores
--      a frozen snapshot, not a pointer to be recomputed later).
--   2. Business/campus/event data must be isolated between
--      organizations (organization_id + RLS, see 0002_rls_policies.sql).
--   3. EcoCoins are a separate ledger from emissions calculations — never
--      derived by reading assessment_results directly, only by an
--      explicit reward_policies-driven entry.
--   4. Nothing here hard-deletes an emission factor; a revision inserts a
--      new version row so historical assessment_results stay accurate.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Organizations (business / campus / event accounts)
-- ---------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null check (org_type in ('business', 'campus', 'event')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'org_admin', 'admin')),
  organization_id uuid references organizations (id) on delete set null,
  default_user_type text check (
    default_user_type in ('individual', 'household', 'business', 'campus', 'event')
  ),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Emission factors — versioned, never overwritten in place
-- ---------------------------------------------------------------------
create table emission_factors (
  id text primary key, -- stable human-readable id, e.g. "IN-ELEC-GRID-2026"
  category text not null,
  unit text not null,
  value numeric not null,
  output_unit text not null default 'kgCO2e',
  region text not null,
  scope text not null check (scope in ('scope1', 'scope2', 'scope3')),
  source text not null,
  source_url text,
  publication text not null,
  effective_year integer not null,
  version integer not null default 1,
  supersedes text references emission_factors (id),
  notes text,
  uncertainty text,
  needs_validation boolean not null default true,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (category, region, effective_year, version)
);

create index idx_emission_factors_category_region on emission_factors (category, region);

-- ---------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------
create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  organization_id uuid references organizations (id) on delete set null,
  user_type text not null check (
    user_type in ('individual', 'household', 'business', 'campus', 'event')
  ),
  reporting_year integer not null,
  region text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assessments_user on assessments (user_id);
create index idx_assessments_org on assessments (organization_id);

-- ---------------------------------------------------------------------
-- Assessment inputs — the raw activity data a user entered
-- ---------------------------------------------------------------------
create table assessment_inputs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  category text not null,
  -- quantity is nullable BY DESIGN: null means "not answered", distinct
  -- from 0 which means "answered, and the value is zero".
  quantity numeric,
  unit text not null,
  region_override text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_assessment_inputs_assessment on assessment_inputs (assessment_id);

-- ---------------------------------------------------------------------
-- Assessment results — a frozen snapshot of a calculation run
-- ---------------------------------------------------------------------
-- Stored as a snapshot (not recomputed from current emission_factors on
-- every read) so a historical report stays reproducible even after the
-- factor dataset is later revised. `result` holds the full
-- AssessmentResult JSON (categories, completeness, etc.) exactly as
-- shown to the user at calculation time.
create table assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  factor_set_version text not null,
  total_kg_co2e numeric not null,
  contains_unvalidated_factors boolean not null default false,
  result jsonb not null,
  calculated_at timestamptz not null default now()
);

create index idx_assessment_results_assessment on assessment_results (assessment_id);

-- ---------------------------------------------------------------------
-- Evidence files (shared by assessments and mission participations)
-- ---------------------------------------------------------------------
create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('assessment', 'mission_participation')),
  owner_id uuid not null,
  storage_path text not null,
  uploaded_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index idx_evidence_files_owner on evidence_files (owner_type, owner_id);

-- ---------------------------------------------------------------------
-- Reward policies — configurable EcoCoins rules (admin-managed)
-- ---------------------------------------------------------------------
create table reward_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type text not null check (
    trigger_type in ('assessment_submitted', 'mission_completed', 'referral', 'manual_adjustment')
  ),
  amount integer not null,
  active boolean not null default true,
  requires_evidence_review boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EcoCoins ledger — append-only transaction log
-- ---------------------------------------------------------------------
-- EcoCoins are a platform reward, not a carbon credit. This table is
-- never read by the calculation engine and never influences
-- assessment_results — it is populated only by explicit
-- reward_policies-driven events (an assessment submission, a reviewed
-- mission completion, a manual admin adjustment).
create table ecocoins_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  amount integer not null, -- positive = credit, negative = reversal/adjustment
  reward_policy_id uuid references reward_policies (id),
  source_type text not null check (
    source_type in ('assessment', 'mission_participation', 'referral', 'admin_adjustment')
  ),
  source_id uuid, -- id of the assessment / mission_participation / etc.
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- a hash of (user_id, source_type, source_id) enforced unique below
  -- prevents the same submission being rewarded twice
  dedupe_key text not null,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dedupe_key)
);

create index idx_ecocoins_ledger_user on ecocoins_ledger (user_id);

-- ---------------------------------------------------------------------
-- Green Missions
-- ---------------------------------------------------------------------
create table missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null check (
    category in ('tree_planting', 'waste_collection', 'energy_reduction', 'water_conservation', 'other')
  ),
  -- what a participation's "measured_metric_value" is denominated in,
  -- e.g. "trees_planted", "kg_waste_collected", "kg_co2e_avoided"
  metric_unit text not null,
  active boolean not null default true,
  start_date date,
  end_date date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Mission participations — separate estimated vs measured outcomes
-- ---------------------------------------------------------------------
create table mission_participations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'joined' check (
    status in ('joined', 'submitted', 'under_review', 'approved', 'rejected')
  ),
  -- the participant's own claim, before review
  estimated_metric_value numeric,
  -- what a reviewer confirmed after checking evidence; this is what
  -- feeds "measured emissions reductions" style reporting, never the
  -- estimated value
  measured_metric_value numeric,
  -- additional outcome fields some mission categories care about
  trees_planted integer,
  trees_survived integer,
  waste_collected_kg numeric,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_mission_participations_mission on mission_participations (mission_id);
create index idx_mission_participations_user on mission_participations (user_id);

-- ---------------------------------------------------------------------
-- Audit log — append-only, written by triggers/service role only
-- ---------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  action text not null, -- e.g. "emission_factor.create", "ecocoins.approve"
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_entity on audit_log (entity_type, entity_id);
