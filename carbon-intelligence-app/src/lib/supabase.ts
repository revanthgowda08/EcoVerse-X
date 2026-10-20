import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `null` until a real Supabase project is configured (see
 * .env.example). The app must run — calculator fully usable, results
 * visible — with this unset; only persistence (save/login/admin)
 * degrades. Check `isSupabaseConfigured` before any call that assumes
 * a session exists.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConfigured = supabase !== null
