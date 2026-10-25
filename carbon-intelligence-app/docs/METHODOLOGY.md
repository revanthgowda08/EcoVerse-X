# Methodology

This is the formal reference for how Ecoverse Carbon Intelligence
calculates an emissions result — written for a reviewer, auditor, or
procurement evaluator deciding whether to rely on it, not for the
calculator's own end users (see the in-app Methodology page,
`src/pages/Methodology.tsx`, for that audience; it renders the same
factor table this document describes, generated live from the same
source data, so the two can never drift out of sync with each other).

## Compliance posture — read this first

**This tool is not currently certified against any standard.** It is
built to be *consistent with* the GHG Protocol's structure and
definitions (see below), and every emission factor is sourced from a
named, dated publication — but:

- No factor has been confirmed by a qualified carbon-accounting
  reviewer against its primary source's current edition (every factor
  carries `needsValidation: true` in the dataset for exactly this
  reason — see `src/lib/data/emission-factors.ts`).
- It has not been through a third-party verification/assurance process
  (e.g. ISO 14064-3), which is what "certified" would actually require
  for a government or commercial deployment to cite this tool's output
  as an audited figure.
- It calculates Scope 1/2/3 *activity-based* emissions for the
  boundaries a user selects — it does not itself constitute a complete
  organizational GHG inventory (e.g. it has no Scope 3 Category 1-15
  completeness check, no consolidation approach selection, no base-year
  recalculation policy).

Anyone evaluating this for a use case where the output needs to stand
up to external scrutiny should commission that review before relying on
it as such. This document exists to make that review tractable — a
reviewer can check every claim below against the actual source instead
of having to reverse-engineer the calculation logic first.

## Core calculation

```
Emissions (kg CO2e) = Activity data × Emission factor
```

implemented in `src/lib/calc/engine.ts`, a pure function with no
side effects and no AI/LLM involvement anywhere in the arithmetic path
— `calculateAssessment(assessment, factors, expectedSlots)` is
deterministic: the same three inputs always produce the same output,
verified by `engine.test.ts`'s reproducibility tests. Four rules are
enforced in code, not just in this document:

1. **A missing answer is never treated as zero.** `quantity: null`
   (not answered) and `quantity: 0` (answered, zero) are distinct
   states tracked separately through the whole pipeline, from the
   database column (`assessment_inputs.quantity` is nullable by
   design) to the final `CategoryStatus` shown to the user
   (`not_provided` vs. `ok`). A result's completeness percentage is
   computed from this distinction.
2. **Unit conversion is explicit and fails closed.** `src/lib/calc/units.ts`
   refuses to convert between incompatible dimensions (e.g. a volume
   unit against an energy factor) rather than guessing — `calculateCategory`
   flags this as `unit_conversion_unsupported`, excluded from the total,
   not silently coerced.
3. **Every emission factor is versioned and never overwritten.**
   `emission_factors.unique(category, region, effective_year, version)`
   — a factor revision is always a new row with `supersedes` pointing
   at the one it replaces (see `supabase/migrations/0001_init_schema.sql`).
   `findFactor()` resolves the best match for a given category/region/
   year: exact region preferred over a `GLOBAL` fallback, highest
   `effective_year` ≤ the reporting year, highest `version` among ties.
4. **A calculated result is frozen at calculation time.**
   `assessment_results.result` (jsonb) stores the complete output,
   including which exact factor id/version produced each line — not a
   pointer recomputed against the live factor table on every view. A
   report pulled up a year later shows what was true when it was
   calculated, even if the factor dataset has since been revised. This
   is what makes year-over-year comparison and any future audit
   trail meaningful instead of silently shifting underfoot.

## Scope assignment (GHG Protocol alignment)

Every emission factor and every questionnaire category is assigned
exactly one scope, per the GHG Protocol Corporate Standard's
definitions:

| Scope | Definition used here | Categories in this tool |
|---|---|---|
| **Scope 1** | Direct emissions from sources owned or controlled by the reporting entity | `cooking.lpg`, `cooking.png`, `transport.fuel.petrol/diesel/cng` (owned-vehicle fuel), `stationary.fuel.diesel/lpg` (generators/boilers) |
| **Scope 2** | Indirect emissions from purchased electricity, heat, or steam | `electricity.grid` |
| **Scope 3** | All other indirect emissions in the value chain | `transport.public.bus/rail`, `transport.air.domestic/international`, `waste.landfill.mixed`, `food.diet.*` |

This tool does **not** currently implement the GHG Protocol's full
Scope 3 category taxonomy (the 15 standard categories under the
Corporate Value Chain standard) — the Scope 3 factors above correspond
loosely to Category 6 (Business Travel) and Category 5 (Waste
Generated in Operations) but are not labelled or boundary-tested
against that taxonomy. An organization needing a Category-complete
Scope 3 inventory should treat this tool's Scope 3 output as partial,
not comprehensive.

## Organizational and operational boundary

Boundary selection is left to the user via the five user types
(Individual, Household, Business/MSME, Campus/institution, Event
organizer) and the questionnaire sections each resolves to
(`src/lib/data/category-manifest.ts`) — this tool does not itself
determine or enforce a consolidation approach (equity share,
financial control, operational control). A business/campus/event
assessment's `organization_id` provides data isolation between
organizations (enforced by Row Level Security — see `docs/API.md`),
not boundary-setting logic.

## Data quality and uncertainty

Every emission factor carries an `uncertainty` field describing its
specific known limitation — not a generic disclaimer. Examples actually
in the dataset today: the India grid factor's year-to-year drift
between CEA publication versions; the flight factors' CO2-only basis
versus DEFRA's "with radiative forcing" headline figures (a genuine
methodology choice, not an error — see the factor's own note); the UK
dietary study used as a simplified proxy for India-specific food-system
emissions. None of this is summarized away — the full text is in
`src/lib/data/emission-factors.ts` and rendered verbatim on the in-app
Methodology page. A reviewer should read the specific uncertainty note
for any factor material to their use case, not rely on the aggregate
`needsValidation: true` flag alone.

## What this tool explicitly does not do

Carried over from the product requirements this was built against, and
enforced in code, not just stated here:

- **No unsupported peer comparisons or rankings.** The results
  dashboard shows the user's own numbers only.
- **No AI-generated value can override the deterministic engine.**
  `recommendationsFor()` (`src/lib/recommendations.ts`) is rule-based,
  mapped from category to a fixed suggestion template — there is no
  LLM call anywhere in the calculation or recommendation path.
- **No carbon credits are issued.** EcoCoins are a platform reward,
  structurally separate from emissions data (see `docs/API.md`'s
  section on `ecocoins_ledger`) — never convertible to or labelled as
  an offset or credit.
