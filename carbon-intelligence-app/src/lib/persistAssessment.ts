import { supabase } from './supabase'
import type { ActivityInput, Assessment, AssessmentResult } from './calc/types'

export interface SavedAssessmentSummary {
  id: string
  userType: string
  reportingYear: number
  region: string
  totalKgCO2e: number
  calculatedAt: string
}

/**
 * Persists an assessment exactly the way supabase/migrations/0001 is
 * shaped for: the assessment row, its raw inputs, and a frozen result
 * snapshot (not a pointer to recompute later — see the migration's own
 * comment on assessment_results for why). Three inserts, not a single
 * RPC, so a partial failure is visible rather than silently swallowed
 * by a stored procedure — acceptable here since `assessments` has no
 * other reader until this function finishes.
 */
export async function saveAssessment(
  userId: string,
  assessment: Assessment,
  inputs: ActivityInput[],
  result: AssessmentResult,
  organizationId?: string | null
): Promise<{ assessmentId: string | null; error: string | null }> {
  if (!supabase) return { assessmentId: null, error: 'Supabase is not configured.' }

  const { data: assessmentRow, error: assessmentError } = await supabase
    .from('assessments')
    .insert({
      user_id: userId,
      organization_id: organizationId ?? null,
      user_type: assessment.userType,
      reporting_year: assessment.reportingYear,
      region: assessment.region,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (assessmentError || !assessmentRow) {
    return { assessmentId: null, error: assessmentError?.message ?? 'Could not create assessment.' }
  }

  const assessmentId = assessmentRow.id as string

  if (inputs.length > 0) {
    const { error: inputsError } = await supabase.from('assessment_inputs').insert(
      inputs.map((input) => ({
        assessment_id: assessmentId,
        category: input.category,
        quantity: input.quantity,
        unit: input.unit,
        region_override: input.region ?? null,
        notes: input.notes ?? null,
      }))
    )
    if (inputsError) return { assessmentId, error: inputsError.message }
  }

  const { error: resultError } = await supabase.from('assessment_results').insert({
    assessment_id: assessmentId,
    factor_set_version: result.factorSetVersion,
    total_kg_co2e: result.totalKgCO2e,
    contains_unvalidated_factors: result.containsUnvalidatedFactors,
    result,
  })
  if (resultError) return { assessmentId, error: resultError.message }

  return { assessmentId, error: null }
}

export async function listMyAssessments(userId: string): Promise<SavedAssessmentSummary[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('assessments')
    .select('id, user_type, reporting_year, region, assessment_results(total_kg_co2e, calculated_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => {
    // assessment_results is a one-to-many join in the query above, but
    // in practice each assessment has exactly one snapshot (recalculating
    // writes a new assessment, not a second snapshot) — use the latest.
    const results = (row as { assessment_results?: { total_kg_co2e: number; calculated_at: string }[] })
      .assessment_results
    const latest = results?.[results.length - 1]
    return {
      id: row.id as string,
      userType: row.user_type as string,
      reportingYear: row.reporting_year as number,
      region: row.region as string,
      totalKgCO2e: latest?.total_kg_co2e ?? 0,
      calculatedAt: latest?.calculated_at ?? '',
    }
  })
}

export async function loadAssessmentResult(assessmentId: string): Promise<AssessmentResult | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('assessment_results')
    .select('result')
    .eq('assessment_id', assessmentId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data.result as AssessmentResult
}
