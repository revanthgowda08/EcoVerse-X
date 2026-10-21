# Ecoverse Carbon Intelligence

A carbon footprint calculator and sustainability intelligence module for
Ecoverse. This is the **source project** — it builds to static files
deployed at `/carbon-intelligence/` alongside the rest of the Ecoverse
site (which has no build step of its own; this is a separate, bundled
Vite app whose *output* gets copied into the main site's repo).

## Status

This is a working foundation, not the complete PRD. Built so far:

- ✅ Deterministic calculation engine (`src/lib/calc/`) — versioned
  emission factors, explicit unit conversion, missing-data handling
  that never silently defaults to zero, full reproducibility. 44
  passing tests (`npm test`).
- ✅ Seeded emission-factor dataset (17 factors covering electricity,
  cooking fuel, vehicle fuel, stationary combustion/generators, public
  transport, air travel, diet, and waste) — every factor cited with
  source, publication, year, and an explicit `needsValidation` flag.
  **See "Before production" below.**
- ✅ Questionnaires + results dashboard for all five user types —
  Individual, Household, Business/MSME (Scope 1/2/3), Campus/
  institution, and Event organizer — with category breakdown,
  completeness indicator, main-contributors chart, and rule-based
  reduction opportunities.
- ✅ Methodology page with full source attribution.
- ✅ Supabase schema (`supabase/migrations/`) — versioned emission
  factors, assessments with frozen result snapshots for
  reproducibility, organization-level data isolation via RLS, an
  EcoCoins ledger kept structurally separate from the calculation
  engine, Green Missions with separate estimated-vs-measured outcome
  fields, and an admin-only audit log.
- ✅ Supabase auth (`src/state/authStore.tsx`) and account/history UI
  (`Account.tsx`, `History.tsx`, `SavedResult.tsx`) — sign up/in, save
  an assessment's result as a frozen snapshot, browse past
  assessments, revisit one without recalculating it.
- ✅ Admin interface (`Admin.tsx`, gated on `profile.role === 'admin'`)
  — add new emission-factor versions (never overwrites, always
  supersedes), view reward policies, view the audit log.
- ✅ Green Missions + EcoCoins UI (`Missions.tsx`) — join a mission,
  submit an estimate for review, see approved EcoCoins balance; coins
  are explicitly labelled as platform rewards, not carbon credits.
- ✅ CSV export (`src/lib/exportCsv.ts`), wired into both the live
  results page and saved/historical results.
- ✅ Routing uses `HashRouter`, not `BrowserRouter` — see the comment
  in `src/main.tsx` for why (GitHub Pages has no SPA fallback, so a
  direct link to a client-side route would 404 under `BrowserRouter`).
- The app still runs fully with **no Supabase project connected** —
  the calculator, questionnaires, and results work standalone; only
  persistence/auth/admin/missions show an informational "not
  connected yet" state (verified end-to-end, zero console errors).

Not yet built (tracked as follow-up work):

- PDF export (CSV is done; PDF is not).
- Standalone API documentation beyond this README and the SQL
  migration comments (the "API" here is direct Supabase table/RPC
  access under RLS, not a separate HTTP service).
- Automated deployment (currently a manual build-and-copy step, see
  below).
- Live validation against a real Supabase project (structurally
  verified via TypeScript + the migrations; not yet run against an
  actual Supabase instance, since none exists in this environment).

## Before production

Every emission factor in `src/lib/data/emission-factors.ts` is marked
`needsValidation: true` and carries an `uncertainty` note. These are
reasonable, cited starting points (IPCC defaults, UK DEFRA/DESNZ
factors used as global fallbacks, a published UK dietary-emissions
study) — **not yet confirmed by a qualified carbon-accounting reviewer
against the latest official publication for each one**, and several are
explicitly flagged as lower-confidence (the CNG per-kg conversion, the
India grid factor's year-to-year drift, the diet factors' UK-vs-India
mismatch). Do not present results from this tool as certified until
that review happens.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # run the calculation engine test suite (vitest)
npm run build      # typecheck + production build to dist/
```

### Deploying

The main Ecoverse site is static files served from the repo root via
GitHub Pages — there's no build pipeline there. Until that changes,
deploying this app means:

```bash
npm run build
rm -rf ../carbon-intelligence/*
cp -r dist/* ../carbon-intelligence/
```

then commit `../carbon-intelligence/` (the built output) in the main
site repo. `vite.config.ts` sets `base: '/carbon-intelligence/'` so the
built asset paths match that deploy location.

### Connecting Supabase

The app runs fully without Supabase configured — the calculator works,
results display, nothing crashes. Only persistence degrades
(`src/lib/supabase.ts` exports `null` when unconfigured).

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order (via the
   Supabase SQL editor, or `supabase db push` with the Supabase CLI).
3. Copy `.env.example` to `.env.local` and fill in
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from
   Project Settings → API.
4. The first real user should be promoted to `role = 'admin'` directly
   in the `profiles` table (there is no self-service admin signup, by
   design).

## Architecture notes

- **Calculation engine is pure and framework-agnostic**
  (`src/lib/calc/engine.ts`, `units.ts`, `types.ts`) — no React, no
  Supabase import. It's unit-tested in isolation and could be reused
  server-side (e.g. in a Supabase Edge Function) without change if a
  future phase needs server-side recalculation.
- **`ExpectedSlot` vs. raw category strings**: an option-based question
  (e.g. "which cooking fuel do you use?") resolves to one of several
  concrete emission-factor categories. Completeness tracking groups
  those alternatives into one slot — see the doc comment on
  `ExpectedSlot` in `types.ts` for why a flatter design was wrong (it
  was tried, caught by a test, and fixed — see
  `engine.test.ts`'s "option-based slot" test).
- **`assessment_results` stores a frozen JSON snapshot**, not a
  pointer to recompute later — a historical report stays accurate even
  after `emission_factors` is revised.
- **EcoCoins are never derived from `assessment_results`.** The ledger
  is populated only via the `award_ecocoins` SQL function
  (`supabase/migrations/0004_functions.sql`), gated by an active
  `reward_policies` row, with a `dedupe_key` unique constraint
  preventing double-awarding the same submission.
