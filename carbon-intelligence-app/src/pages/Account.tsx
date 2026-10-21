import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'

export function Account() {
  const { configured, user, profile, loading, signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmNotice, setConfirmNotice] = useState(false)

  if (!configured) {
    return (
      <div className="page-intro">
        <p className="eyebrow">Account</p>
        <h1>Accounts aren't connected yet</h1>
        <p>
          This deployment hasn't been wired to a Supabase project, so saving results, viewing
          history, and admin access aren't available. The calculator itself works fully without
          this — see the project README for how to connect one.
        </p>
      </div>
    )
  }

  if (loading) return null

  if (user) {
    return (
      <div className="page-intro">
        <p className="eyebrow">Account</p>
        <h1>{profile?.display_name || user.email}</h1>
        <p>Signed in as {user.email}{profile?.role && profile.role !== 'user' ? ` · ${profile.role}` : ''}.</p>
        <div className="assessment-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="button secondary" onClick={() => navigate('/history')}>
            My assessments
          </button>
          {profile?.role === 'admin' && (
            <button type="button" className="button secondary" onClick={() => navigate('/admin')}>
              Admin
            </button>
          )}
          <button type="button" className="button secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (mode === 'signUp') {
      setConfirmNotice(true)
      return
    }
    navigate('/history')
  }

  return (
    <div>
      <p className="eyebrow">Account</p>
      <h1>{mode === 'signIn' ? 'Sign in' : 'Create an account'}</h1>
      <p style={{ color: 'var(--soft-sage)' }}>
        Save your assessments and come back to them later. You can keep using the calculator
        without an account — this is only needed to save results.
      </p>

      {confirmNotice ? (
        <div className="banner info">Check your email to confirm your account, then sign in.</div>
      ) : (
        <form onSubmit={handleSubmit} className="section-card" style={{ display: 'grid', gap: 14, maxWidth: 420 }}>
          <label>
            <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>Email</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--line)' }}
            />
          </label>
          <label>
            <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>Password</div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--line)' }}
            />
          </label>
          {error && <div className="banner warning">{error}</div>}
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          >
            {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      )}
    </div>
  )
}
