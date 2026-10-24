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
- ✅ CSV export (`src/lib/exportCsv.ts`) and PDF export (the browser's
  own print-to-PDF, via a print stylesheet in `src/styles/app.css` that
  hides navigation/buttons and keeps the report), both wired into the
  live results page and saved/historical results.
- ✅ Routing uses `HashRouter`, not `BrowserRouter` — see the comment
  in `src/main.tsx` for why (GitHub Pages has no SPA fallback, so a
  direct link to a client-side route would 404 under `BrowserRouter`).
- ✅ API reference (`docs/API.md`) — the Supabase table/RLS/RPC surface
  this app calls "the API" (there is no separate HTTP service).
- ✅ **Connected to a live Supabase project** (`ecoverse-carbon-intelligence`,
  `ap-south-1`) — all 7 migrations applied, 17 emission factors seeded,
  RLS verified table-by-table, security advisors re-checked clean. The
  app still runs fully with no Supabase project configured too (set
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` to point it at a
  different project, or unset them to go back to standalone mode) —
  only persistence/auth/admin/missions degrade, never the calculator
  itself.
- Two real bugs found and fixed while connecting this for the first
  time (not found by reading the code alone — only by tracing the
  actual live path):
  - `signUp()` never created a matching `profiles` row, and `profiles`
    has no client-side INSERT policy either — every real signup would
    have hit a foreign-key violation the moment it tried to save an
    assessment. Fixed with the standard Supabase `auth.users` trigger
    (`0006_auto_create_profile.sql`).
  - `award_ecocoins` doesn't verify that `p_source_id` is a real,
    qualifying event — only that the reward policy is active and that
    `(user, source_type, source_id)` hasn't been used. Nothing in the
    shipped client calls it yet, so it was reachable but unused; revoked
    `EXECUTE` from `anon`/`authenticated` until a service-role path
    (e.g. an Edge Function, once the admin EcoCoins-review screen
    exists) calls it after independently verifying the event —
    never client code with a user-supplied `source_id`
    (`0005_security_hardening.sql`).

Not yet built (tracked as follow-up work):

- Automated deployment (currently a manual build-and-copy step, see
  below).
- A full browser-based click-through of the live auth/save/admin flow
  against the connected project — this session's sandbox has its
  general network egress blocked for the project's own host (confirmed
  via direct `curl`; the Supabase MCP tool's dedicated connection still
  works), so verification here stopped at: migrations applied, schema
  inspected, RLS/grants checked directly via SQL, and the trigger
  confirmed attached — not an actual sign-up completed through a
  browser. Test the real flow on the deployed site, where this
  restriction won't apply.

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

A web-search-based re-verification pass (2026-10-21, `DATASET_VERSION
'seed-2026.2'`) cross-checked every factor's citation against public
secondary sources — it is explicitly **not** the qualified review above,
only a sanity check, and every factor still carries `needsValidation:
true`. It found and fixed two real issues: the India grid factor was
corrected from 0.79 to 0.727 kgCO2e/kWh (CEA's published FY2023-24
weighted-average figure), and the landfill-waste factor's citation was
re-attributed from IPCC Vol. 5 (which doesn't actually publish a flat
per-kg default — it requires a decay model) to DEFRA/DESNZ's household-
residual-waste factor, which does, and already closely matched the
existing number. It also flagged a methodology ambiguity worth the
reviewer's attention: the flight factors here are deliberately CO2-only
(excluding DEFRA's optional radiative-forcing uplift), which reads much
lower than DEFRA's own "with RF" headline figures for the same routes —
see the `uncertainty` notes on `transport.air.domestic`/`.international`
for specifics. See each factor's `uncertainty` field for exactly what
could and couldn't be corroborated this pass.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # run the calculation engine test suite (vitest)
npm run build      # typecheck + production build to dist/
```

### Deploying

The main Ecoverse site is static files served from the repo root via
GitHub Pages — there's no build pipeline there, so this app's *build
output* is committed directly into the main site repo as a sibling
directory. There are two repos in play: `carbon-intelligence-app/` (this
project, the source) lives alongside `carbon-intelligence/` (the built
output that actually gets served), both at the root of whichever repo
mirrors the live Ecoverse site.

1. Build:
   ```bash
   npm run build
   ```
2. Replace the deployed copy with the fresh build:
   ```bash
   rm -rf ../carbon-intelligence/*
   cp -r dist/* ../carbon-intelligence/
   ```
   `vite.config.ts` sets `base: '/carbon-intelligence/'` so the built
   asset paths match this deploy location — don't change one without
   the other.
3. Commit **both** `carbon-intelligence-app/` (source) and
   `carbon-intelligence/` (output) in the same commit, so the repo
   never has a build output that doesn't match its source.
4. Push. GitHub Pages serves whatever is on the default branch at the
   repo root — there's no separate deploy step or CI pipeline to
   trigger; the push *is* the deploy.
5. Sanity-check the live URL after a push: open
   `https://ecoverseearth.com/carbon-intelligence/`, then a
   deep link like `.../carbon-intelligence/#/methodology` to confirm
   routing still works (this is why the app uses `HashRouter` —
   anything after the `#` never reaches GitHub Pages's server, so it
   can't 404).

If this project is later split across two repos that both mirror the
live site (as happened during initial development), push to each one
separately and `git fetch` + diff the other repo's `main` first —
don't blindly overlay one onto the other, in case something else has
changed it in the meantime.

### Connecting Supabase

**Already done for the deployed build** — it points at a live project
(`ecoverse-carbon-intelligence`, `ap-south-1`) with all 7 migrations
applied. The app still runs fully without Supabase configured at all —
the calculator works, results display, nothing crashes. Only
persistence degrades (`src/lib/supabase.ts` exports `null` when
unconfigured).

To point this at a **different** project instead:

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` **in order, all 7** —
   `0001`-`0004` build the schema, `0005` and part of `0006` lock down
   function privileges that are easy to get wrong (see their comments:
   Postgres grants `EXECUTE` to `PUBLIC` by default, and Supabase
   separately auto-grants `anon`/`authenticated` directly — revoking
   from one without the other silently does nothing), and `0006`/`0007`
   add the signup trigger and starter Missions content.
3. Copy `.env.example` to `.env.local` and fill in
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from
   Project Settings → API (the **publishable** key — `sb_publishable_...`
   — not a service-role key, which must never go in client code or this
   file).
4. The first real user should be promoted to `role = 'admin'` directly
   in the `profiles` table (there is no self-service admin signup, by
   design).
5. After applying migrations to any project, run the Supabase advisor
   (`get_advisors` with the MCP tool, or Database → Advisors in the
   dashboard) and confirm it's clean — this is how the two bugs above
   were actually found, not from reading the SQL alone.

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
