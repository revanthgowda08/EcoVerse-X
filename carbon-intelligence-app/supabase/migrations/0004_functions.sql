-- Trusted server-side functions.
--
-- These run as SECURITY DEFINER (the function owner's privileges, not
-- the calling user's), which is what lets them write to ecocoins_ledger
-- and audit_log despite those tables granting no direct INSERT policy
-- to the "authenticated" role. Client code calls these via
-- `supabase.rpc(...)` — it never writes to those two tables directly.

-- ---------------------------------------------------------------------
-- Award EcoCoins for an event, enforcing duplicate-submission protection
-- via the ledger's (dedupe_key) unique constraint.
-- ---------------------------------------------------------------------
create or replace function award_ecocoins(
  p_user_id uuid,
  p_reward_policy_id uuid,
  p_source_type text,
  p_source_id uuid
) returns ecocoins_ledger as $$
declare
  v_policy reward_policies;
  v_dedupe_key text;
  v_entry ecocoins_ledger;
begin
  select * into v_policy from reward_policies where id = p_reward_policy_id and active = true;
  if not found then
    raise exception 'No active reward policy %', p_reward_policy_id;
  end if;

  v_dedupe_key := p_user_id::text || ':' || p_source_type || ':' || p_source_id::text;

  insert into ecocoins_ledger (user_id, amount, reward_policy_id, source_type, source_id, status, dedupe_key)
  values (
    p_user_id,
    v_policy.amount,
    p_reward_policy_id,
    p_source_type,
    p_source_id,
    case when v_policy.requires_evidence_review then 'pending' else 'approved' end,
    v_dedupe_key
  )
  on conflict (dedupe_key) do nothing
  returning * into v_entry;

  if v_entry.id is null then
    raise exception 'EcoCoins already awarded for % % %', p_user_id, p_source_type, p_source_id;
  end if;

  perform write_audit_log(p_user_id, 'ecocoins.award', 'ecocoins_ledger', v_entry.id::text, null, to_jsonb(v_entry));

  return v_entry;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- Approve/reject a pending EcoCoins entry (admin evidence-review step)
-- ---------------------------------------------------------------------
create or replace function review_ecocoins_entry(
  p_entry_id uuid,
  p_approve boolean
) returns ecocoins_ledger as $$
declare
  v_before ecocoins_ledger;
  v_after ecocoins_ledger;
begin
  if not is_admin() then
    raise exception 'Only admins can review EcoCoins entries';
  end if;

  select * into v_before from ecocoins_ledger where id = p_entry_id;
  if not found then
    raise exception 'EcoCoins ledger entry % not found', p_entry_id;
  end if;

  update ecocoins_ledger
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_entry_id
  returning * into v_after;

  perform write_audit_log(auth.uid(), 'ecocoins.review', 'ecocoins_ledger', p_entry_id::text, to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- Generic audit-log writer, used by the functions above and by admin
-- tooling (e.g. emission-factor edits) added in later migrations.
-- ---------------------------------------------------------------------
create or replace function write_audit_log(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb,
  p_after jsonb
) returns void as $$
begin
  insert into audit_log (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_before, p_after);
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- Prevent a user from escalating their own role via the generic
-- "update their own profile" policy.
-- ---------------------------------------------------------------------
create or replace function prevent_self_role_escalation() returns trigger as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an admin can change a profile''s role';
  end if;
  if new.organization_id is distinct from old.organization_id and not is_admin() then
    raise exception 'Only an admin can reassign a profile''s organization';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_prevent_self_role_escalation
  before update on profiles
  for each row execute function prevent_self_role_escalation();

-- ---------------------------------------------------------------------
-- Prevent a non-admin from writing measured_metric_value / status
-- directly on their own mission_participations row (those fields are
-- an evidence-review outcome, not something a participant self-reports).
-- ---------------------------------------------------------------------
create or replace function guard_mission_participation_review_fields() returns trigger as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.measured_metric_value is distinct from old.measured_metric_value
    or new.status is distinct from old.status
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Only an admin can set review outcome fields on a mission participation';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_guard_mission_participation_review_fields
  before update on mission_participations
  for each row execute function guard_mission_participation_review_fields();
