import { supabase } from './supabase'
import { downloadFile } from './exportCsv'

/**
 * Everything RLS lets the signed-in user read about themselves, across
 * every table that references them — not just assessments. This is the
 * "export my data" self-service path a privacy policy promising data
 * portability has to actually back up with something real, not a page
 * that says "contact us" and goes nowhere.
 */
export async function exportMyData(userId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase is not configured.' }

  // assessment_inputs/assessment_results have no user_id column of their
  // own (ownership follows the parent assessment) — their RLS policy
  // already restricts reads to rows whose parent assessment belongs to
  // the caller, so a plain unfiltered select returns exactly "my data"
  // regardless of query shape. Filtering by userId explicitly everywhere
  // else is redundant with RLS too, but kept for clarity about intent.
  const [profile, assessments, inputs, results, ecocoins, missions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('assessments').select('*').eq('user_id', userId),
    supabase.from('assessment_inputs').select('*'),
    supabase.from('assessment_results').select('*'),
    supabase.from('ecocoins_ledger').select('*').eq('user_id', userId),
    supabase.from('mission_participations').select('*').eq('user_id', userId),
  ])

  const firstError = [profile, assessments, inputs, results, ecocoins, missions].find((r) => r.error)?.error
  if (firstError) return { error: firstError.message }

  const bundle = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    assessments: assessments.data,
    assessment_inputs: inputs.data,
    assessment_results: results.data,
    ecocoins_ledger: ecocoins.data,
    mission_participations: missions.data,
  }

  downloadFile(
    `ecoverse-carbon-intelligence-my-data-${userId}.json`,
    JSON.stringify(bundle, null, 2),
    'application/json;charset=utf-8;'
  )
  return { error: null }
}

/**
 * Deletes the signed-in user's account entirely. This CANNOT be done
 * with a plain client-side `.delete()` call — RLS correctly gives the
 * `authenticated` role no way to remove its own auth.users row, since
 * that has to go through Supabase's Admin API with the service-role
 * key, which must never reach client code. Routed through the
 * `delete-account` Edge Function instead, which resolves the caller's
 * identity from their own session token (never a client-supplied id)
 * before calling the Admin API. Every dependent row (profile,
 * assessments, inputs, results, evidence, ecocoins, mission
 * participations) cascades automatically via the FK chain back to
 * profiles.id -> auth.users.id.
 */
export async function deleteMyAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase is not configured.' }

  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error as string }
  return { error: null }
}
