import { supabase } from './supabase'
import type { UserType } from './calc/types'

interface GuestLeadInput {
  email: string
  displayName?: string
  userType: UserType
  reportingYear: number
  region: string
  totalKgCO2e: number
}

/**
 * Write-only from the client's side: RLS grants INSERT to anyone but no
 * SELECT, so this can never be used to read back what was submitted —
 * only the admin directory can.
 */
export async function submitGuestLead(input: GuestLeadInput): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { error } = await supabase.from('guest_leads').insert({
    email: input.email,
    display_name: input.displayName?.trim() || null,
    user_type: input.userType,
    reporting_year: input.reportingYear,
    region: input.region,
    total_kgco2e: input.totalKgCO2e,
  })
  return { error: error?.message ?? null }
}
