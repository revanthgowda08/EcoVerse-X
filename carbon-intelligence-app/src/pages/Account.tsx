import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { deleteMyAccount, exportMyData } from '../lib/accountData'

export function Account() {
  const { configured, user, profile, loading, signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmNotice, setConfirmNotice] = useState(false)
  const [exportState, setExportState] = useState<'idle' | 'working' | 'error'>('idle')
  const [exportError, setExportError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirming' | 'working' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    async function handleExport() {
      if (!user) return
      setExportState('working')
      setExportError(null)
      const { error } = await exportMyData(user.id)
      if (error) {
        setExportState('error')
        setExportError(error)
        return
      }
      setExportState('idle')
    }

    async function handleDelete() {
      setDeleteStep('working')
      setDeleteError(null)
      const { error } = await deleteMyAccount()
      if (error) {
        setDeleteStep('error')
        setDeleteError(error)
        return
      }
      await signOut()
      navigate('/')
    }

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

        <div className="section-card" style={{ marginTop: 24 }}>
          <h2>Your data</h2>
          <p className="section-description">
            See the <a href="#/privacy">privacy policy</a> for what's stored and why. Both actions
            below are self-service — nothing here requires contacting anyone.
          </p>
          <div className="assessment-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="button secondary" onClick={handleExport} disabled={exportState === 'working'}>
              {exportState === 'working' ? 'Preparing export…' : 'Export my data'}
            </button>
            {deleteStep === 'idle' && (
              <button type="button" className="button secondary" onClick={() => setDeleteStep('confirming')}>
                Delete my account
              </button>
            )}
          </div>
          {exportState === 'error' && <div className="banner warning">Could not export: {exportError}</div>}

          {deleteStep === 'confirming' && (
            <div className="banner warning" style={{ marginTop: 14 }}>
              <strong>This permanently deletes your account and every assessment, result, and
              mission record tied to it. There is no undo and no grace period.</strong>
              <div className="assessment-actions" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
                <button type="button" className="button secondary" onClick={handleDelete}>
                  Yes, permanently delete everything
                </button>
                <button type="button" className="button secondary" onClick={() => setDeleteStep('idle')}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {deleteStep === 'working' && <div className="banner info" style={{ marginTop: 14 }}>Deleting…</div>}
          {deleteStep === 'error' && (
            <div className="banner warning" style={{ marginTop: 14 }}>Could not delete account: {deleteError}</div>
          )}
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
