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
  that never silently defaults to zero, full reproducibility. 32
  passing tests (`npm test`).
- ✅ Seeded emission-factor dataset (15 factors covering electricity,
  cooking fuel, vehicle fuel, public transport, air travel, diet, and
  waste) — every factor cited with source, publication, year, and an
  explicit `needsValidation` flag. **See "Before production" below.**
- ✅ Individual and Household questionnaires + results dashboard
  (category breakdown, completeness indicator, main contributors
  chart, rule-based reduction opportunities).
- ✅ Methodology page with full source attribution.
- ✅ Supabase schema (`supabase/migrations/`) — versioned emission
  factors, assessments with frozen result snapshots for
  reproducibility, organization-level data isolation via RLS, an
  EcoCoins ledger kept structurally separate from the calculation
  engine, Green Missions with separate estimated-vs-measured outcome
  fields, and an admin-only audit log. **Not yet connected to a live
  Supabase project** — see "Connecting Supabase" below.

Not yet built (tracked as follow-up work):

- Business/MSME, Campus, and Event questionnaires (Scope 1/2/3
  category selection, org-level data).
- Supabase auth + save/load assessments in the UI (the schema and
  client wrapper are ready; the UI still only holds an in-progress
  assessment in `sessionStorage`).
- Admin interface for managing emission factors/categories.
- EcoCoins and Green Missions UI (ledger/tables exist; no screens yet).
- PDF/CSV export.
- Automated deployment (currently a manual build-and-copy step).

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
