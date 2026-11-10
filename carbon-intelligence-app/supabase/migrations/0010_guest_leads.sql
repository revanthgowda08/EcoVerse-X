-- Optional, opt-in contact capture for people who use the calculator
-- without an account.
--
-- The calculator is designed to work fully anonymously — `assessments`
-- has a NOT NULL user_id, so a guest's inputs/results are never
-- persisted unless they sign up. That's a deliberate privacy choice
-- (documented in the Privacy Policy) and stays true for anyone who
-- doesn't interact with this feature. This table is strictly additive:
-- a guest sees a "want a copy of your results? leave your email"
-- prompt on the results screen and nothing is written unless they
-- submit it themselves.
--
-- No foreign key to profiles/auth.users — these rows have no account
-- behind them by definition. No UPDATE/DELETE policy for anyone except
-- admins: a guest can't come back and edit or erase a row they don't
-- have a session for (there's nothing to authenticate as), so removal
-- requests are handled by an admin via the Connect page, per the
-- Privacy Policy.

create table guest_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  user_type text not null check (
    user_type in ('individual', 'household', 'business', 'campus', 'event')
  ),
  reporting_year integer not null,
  region text not null,
  total_kgco2e numeric not null,
  created_at timestamptz not null default now()
);

alter table guest_leads enable row level security;

-- Anyone (including an unauthenticated visitor) can submit one — this
-- is the entire point of the feature. No SELECT/UPDATE/DELETE policy
-- is granted to anon/authenticated, so a submission is write-only from
-- the submitter's side; they cannot read back their own row or anyone
-- else's.
create policy "anyone can submit a guest lead"
  on guest_leads for insert
  with check (true);

create policy "admins can read guest leads"
  on guest_leads for select
  using (is_admin());

create policy "admins can delete guest leads"
  on guest_leads for delete
  using (is_admin());

create index idx_guest_leads_created on guest_leads (created_at desc);
