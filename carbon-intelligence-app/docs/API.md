# API reference

This app has no separate backend service. "The API" is direct access to a
Supabase Postgres project — tables and RPC functions, governed by Row Level
Security (RLS) — using the `@supabase/supabase-js` client
(`src/lib/supabase.ts`). Every call below is enforced server-side by a
policy, not by the client; the client-side checks in this app's UI
(`profile.role === 'admin'`, etc.) exist only to render the right screen,
never to gate access on their own.

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset, `supabase` is
`null` and none of this is reachable — the calculator still works fully
without it. See the README's "Connecting Supabase" section to configure a
project.

## Auth

Standard Supabase email/password auth (`supabase.auth.signUp` /
`signInWithPassword` / `signOut`), wrapped by `src/state/authStore.tsx`.
Every authenticated user has exactly one `profiles` row (same `id` as
`auth.users.id`), created by the app on first sign-up with `role = 'user'`.
There is no self-service path to `org_admin` or `admin` — those are set
directly in the `profiles` table (see README).

## Tables

Role column values: **anon** = unauthenticated, **user** = any signed-in
user accessing their own data, **org_admin** = a user whose
`profiles.organization_id` matches the row's `organization_id`,
**admin** = `profiles.role = 'admin'`.

| Table | Read | Write | Notes |
|---|---|---|---|
| `emission_factors` | anon (public) | admin only; **no delete policy exists at all** | A factor "edit" is always an `insert` of a new row with a higher `version` and `supersedes` pointing at the row it replaces — never an `update` of an existing row. See `unique (category, region, effective_year, version)`. |
| `profiles` | self, or admin (any) | self (own `display_name`/`default_user_type` only — a trigger blocks a non-admin from changing their own `role` or `organization_id`), or admin (any) | |
| `organizations` | self's org, or admin (any) | admin only | |
| `assessments` | owner (`user_id`), org_admin for their org's assessments, or admin | owner creates/updates their own | |
| `assessment_inputs` | via parent `assessments` visibility | owner, insert-only in practice (the UI never edits a submitted input) | `quantity` is nullable **by design** — `null` means "not answered," distinct from `0` meaning "answered as zero." Never coerce a missing value to `0` when reading this table directly. |
| `assessment_results` | via parent `assessments` visibility | owner, insert-only | `result` (jsonb) is a frozen snapshot of the full calculation output at the time it ran — read it directly, never recompute from the current `emission_factors` rows and expect it to match a historical report. `factor_set_version` records which dataset version produced it. |
| `evidence_files` | owner of the parent assessment/participation, or admin | owner (insert), admin (any) | Storage path only; actual file bytes live in Supabase Storage, not this table. |
| `reward_policies` | anon (public, so the UI can show "what earns EcoCoins") | admin only | |
| `ecocoins_ledger` | owner (own entries), or admin (any) | **no direct insert/update policy for `authenticated` at all** — only reachable via `award_ecocoins` / `review_ecocoins_entry` below | This is the EcoCoins/carbon-accounting separation boundary: nothing can credit or debit a balance except those two SECURITY DEFINER functions. |
| `missions` | anon (public) | admin only | |
| `mission_participations` | owner, or admin (any) | owner (insert `joined`, update `estimated_metric_value`/`status='submitted'` only — a trigger blocks a non-admin from setting `measured_metric_value`, `status` to anything else, or the `reviewed_*` fields), or admin (any field) | |
| `audit_log` | admin only | **not writable directly at all** — only via `write_audit_log()` | |

## RPC functions

Call these with `supabase.rpc('<name>', { ...params })`. All three run as
`SECURITY DEFINER` (the function owner's privileges, not the caller's) —
that's what lets them write tables the caller otherwise cannot.

### `award_ecocoins(p_user_id uuid, p_reward_policy_id uuid, p_source_type text, p_source_id uuid)`

Inserts an `ecocoins_ledger` row for `p_user_id`, using the amount and
evidence-review requirement from the `reward_policies` row
`p_reward_policy_id` (must be `active = true`). `p_source_type` is one of
`'assessment' | 'mission_participation' | 'referral' | 'admin_adjustment'`.

- **Duplicate-submission protection**: the ledger's
  `dedupe_key = user_id:source_type:source_id` is unique. Calling this
  twice for the same `(user, source_type, source_id)` raises
  `EcoCoins already awarded for ...` on the second call — the caller
  should treat that as "already handled," not retry.
- Returns the inserted `ecocoins_ledger` row. `status` is `'pending'` if
  the policy requires evidence review, `'approved'` otherwise.
- Writes an `audit_log` entry (`action = 'ecocoins.award'`) as a side effect.

### `review_ecocoins_entry(p_entry_id uuid, p_approve boolean)`

Admin-only (raises `Only admins can review EcoCoins entries` otherwise).
Sets a pending `ecocoins_ledger` row's `status` to `'approved'` or
`'rejected'`, stamping `reviewed_by`/`reviewed_at` from the calling admin.
Returns the updated row. Writes an `audit_log` entry
(`action = 'ecocoins.review'`) with before/after snapshots.

### `write_audit_log(p_actor_id uuid, p_action text, p_entity_type text, p_entity_id text, p_before jsonb, p_after jsonb)`

Generic audit-log writer. The two functions above call it internally;
admin tooling added in a future migration (e.g. direct emission-factor
edits outside the "always insert a new version" flow) should call it too
rather than writing `audit_log` any other way — there is no insert policy
on that table for any role.

## Calculation engine (not a network API, but the other half of "the API")

`src/lib/calc/engine.ts` exports `calculateAssessment(assessment, factors,
expectedSlots)` — a pure function, no network calls, usable identically on
the client (as today) or server-side (e.g. inside a Supabase Edge Function,
unchanged, if a future phase needs server-side recalculation or
verification). Given the same `assessment`, `factors` array, and
`expectedSlots`, it always returns the same `AssessmentResult` — see
`engine.test.ts`'s reproducibility tests. This is what the versioned
`emission_factors` table and the frozen `assessment_results.result`
snapshot exist to support: re-running this function against an *old*
factor set (by filtering `factors` to a past `effective_year`/`version`)
reproduces a historical result exactly.
