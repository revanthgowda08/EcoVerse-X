import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  role: 'user' | 'org_admin' | 'admin'
  organization_id: string | null
  created_at?: string
}

interface AuthContextValue {
  configured: boolean
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, email, display_name, role, organization_id, created_at')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile(data as Profile | null)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      user: session?.user ?? null,
      profile,
      loading,
      signUp: async (email, password, displayName) => {
        if (!supabase) return { error: 'Supabase is not configured.' }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: displayName ? { data: { display_name: displayName } } : undefined,
        })
        return { error: error?.message ?? null }
      },
      signIn: async (email, password) => {
        if (!supabase) return { error: 'Supabase is not configured.' }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },
      signOut: async () => {
        if (!supabase) return
        await supabase.auth.signOut()
      },
    }),
    [session, profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
