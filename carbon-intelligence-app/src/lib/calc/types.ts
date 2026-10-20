/**
 * Core types for the Carbon Intelligence calculation engine.
 *
 * Design intent: every number the UI ever shows must be traceable back to
 * (a) a specific activity input the user gave, and (b) a specific, versioned
 * emission factor record. Nothing here guesses at missing data — a category
 * with no input is `provided: false` and contributes `null`, never `0`, to
 * the total.
 */

export type Scope = 'scope1' | 'scope2' | 'scope3'

export type UserType =
  | 'individual'
  | 'household'
  | 'business'
  | 'campus'
  | 'event'

/**
 * A single versioned emission factor record. Mirrors the
 * `emission_factors` table (see supabase/migrations) field for field, so
 * the same shape is used whether the factor came from the seeded local
 * dataset or a live Supabase query.
 */
export interface EmissionFactor {
  /** Stable identifier, e.g. "IN-ELEC-GRID-2024". Never reused for a
   *  different factor value — a revision gets a new id or a bumped
   *  `version`, the old record is kept (superseded, not deleted). */
  id: string
  /** Dot-namespaced activity category, e.g. "electricity.grid". Must
   *  match an ActivityInput.category exactly. */
  category: string
  /** The unit this factor expects its activity quantity expressed in,
   *  e.g. "kWh". The engine converts the user's input unit to this unit
   *  before multiplying — it never multiplies mismatched units. */
  unit: string
  /** The numeric factor: multiplying `unit` quantity by `value` yields
   *  `outputUnit`. */
  value: number
  outputUnit: 'kgCO2e'
  /** ISO-3166-ish region code this factor applies to, e.g. "IN" or
   *  "GLOBAL" for a fallback default. */
  region: string
  scope: Scope
  /** Publisher name, e.g. "Central Electricity Authority (CEA), India". */
  source: string
  sourceUrl?: string
  /** Specific publication/dataset name and edition, e.g.
   *  "CEA CO2 Baseline Database, User Guide Version 19". */
  publication: string
  /** The reporting year this factor is meant to represent. */
  effectiveYear: number
  /** Monotonically increasing per (category, region) — a re-publication
   *  of the same category/region factor bumps this rather than
   *  overwriting, so old assessments stay reproducible against the
   *  version they were actually calculated with. */
  version: number
  /** id of the factor this one supersedes, if any. */
  supersedes?: string
  notes?: string
  /** Free-text data-quality / uncertainty disclosure, shown in the UI
   *  next to any value computed from this factor. */
  uncertainty?: string
  /** Set on seed/placeholder data that has not yet been checked against
   *  the live official publication — surfaced in the UI and must be
   *  cleared by a qualified reviewer before this factor is used for a
   *  published/exported report. */
  needsValidation?: boolean
}

/**
 * One activity line a user has (or has not) answered.
 *
 * `quantity` is deliberately `number | null | undefined` rather than
 * defaulting to 0 — "the user skipped this question" and "the user has
 * zero of this activity" are different facts and must stay different
 * all the way to the result.
 */
export interface ActivityInput {
  category: string
  quantity: number | null | undefined
  /** Unit the quantity is expressed in. Does not need to match the
   *  factor's unit — the engine converts. */
  unit: string
  /** Override the assessment-level region for this one input. */
  region?: string
  notes?: string
}

export interface Assessment {
  userType: UserType
  /** Reporting period, e.g. "2026" or "2026-Q1". Used to select the
   *  correct factor vintage. */
  reportingYear: number
  region: string
  inputs: ActivityInput[]
}

export type CategoryStatus =
  | 'ok'
  | 'not_provided'
  | 'no_factor_found'
  | 'unit_conversion_unsupported'
  | 'invalid_quantity'

export interface CategoryResult {
  category: string
  scope: Scope | null
  status: CategoryStatus
  provided: boolean
  quantity: number | null
  quantityUnit: string | null
  factorId: string | null
  factorVersion: number | null
  factorSource: string | null
  emissionsKgCO2e: number | null
  uncertainty?: string
  needsValidation?: boolean
  /** Human-readable explanation when status !== 'ok', e.g. "No emission
   *  factor found for category 'transport.ferry' in region 'IN' or
   *  fallback 'GLOBAL'." Never silently absorbed into a 0. */
  message?: string
}

/**
 * One questionnaire "slot" the completeness check expects an answer
 * for. `categories` lists every emission-factor category this slot
 * could resolve to — a slot is satisfied if ANY of them was answered.
 * This exists because an option-based question (e.g. "which cooking
 * fuel do you use?") resolves to exactly one concrete category
 * (`cooking.lpg` or `cooking.png`), never the abstract question name
 * itself — a flat string comparison would otherwise permanently mark
 * such a question "missing" even when it was answered.
 */
export interface ExpectedSlot {
  /** Human-readable label for the dashboard, e.g. "Cooking fuel". */
  label: string
  /** The one or more concrete emission-factor categories that satisfy
   *  this slot. A plain required field has exactly one; an
   *  option-based question lists every option's resolved category. */
  categories: string[]
}

export interface CompletenessSummary {
  totalCategories: number
  providedCategories: number
  calculableCategories: number
  /** Labels of slots with no answer among any of their categories. */
  missingCategories: string[]
  /** calculableCategories / totalCategories, in [0, 1]. Drives the
   *  dashboard's "data completeness" indicator — never implied to be
   *  100% just because a total number is shown. */
  completenessRatio: number
}

export interface AssessmentResult {
  userType: UserType
  reportingYear: number
  region: string
  /** Sum of emissionsKgCO2e across categories with status 'ok' only.
   *  Categories that are not_provided/no_factor_found/etc. are excluded
   *  from the sum, not counted as 0. */
  totalKgCO2e: number
  totalTonnesCO2e: number
  categories: CategoryResult[]
  completeness: CompletenessSummary
  /** Any category result still carrying needsValidation data used in
   *  the total — surfaced as a banner so an unverified placeholder
   *  factor is never silently presented as a certified number. */
  containsUnvalidatedFactors: boolean
  calculatedAt: string
  /** Identifies exactly which build of the factor dataset produced this
   *  result (see factors.ts datasetVersion), so a historical result can
   *  be reproduced against the same factor set even after the dataset
   *  is later revised. */
  factorSetVersion: string
}
