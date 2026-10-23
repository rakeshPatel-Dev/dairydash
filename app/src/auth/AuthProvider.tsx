import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { StaffProfile } from '../lib/types'

interface AuthState {
  session: Session | null
  profile: StaffProfile | null
  loading: boolean
  profileMissing: boolean
  profileError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileMissing, setProfileMissing] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setProfile(null)
        setProfileMissing(false)
        return
      }
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('id, full_name, role, can_override_wholesale, can_void, active')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (error) throw error
      setProfile((data as StaffProfile | null) ?? null)
      setProfileMissing(!data)
      setProfileError(null)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not load your staff profile')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        setSession(data.session)
        if (data.session) await loadProfile()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        void loadProfile()
      } else {
        setProfile(null)
        setProfileMissing(false)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Best-effort audit trail; never block sign-in on it.
    const { error: auditError } = await supabase.rpc('log_client_event', {
      p_action: 'login',
      p_details: { email },
    })
    if (auditError) console.warn('Could not write login audit event:', auditError.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      profileMissing,
      profileError,
      signIn,
      signOut,
      refreshProfile: loadProfile,
    }),
    [session, profile, loading, profileMissing, profileError, signIn, signOut, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
