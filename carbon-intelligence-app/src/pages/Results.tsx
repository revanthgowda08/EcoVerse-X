import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../state/assessmentStore'
import { useAuth } from '../state/authStore'
import { calculateAssessment } from '../lib/calc/engine'
import { EMISSION_FACTORS } from '../lib/data/emission-factors'
import { expectedSlotsFor } from '../lib/data/category-manifest'
import { saveAssessment } from '../lib/persistAssessment'
import { assessmentResultToCsv, downloadCsv } from '../lib/exportCsv'
import { submitGuestLead } from '../lib/guestLeads'
import { ResultsView } from '../components/ResultsView'

export function Results() {
  const navigate = useNavigate()
  const { userType, reportingYear, region, buildInputs } = useAssessment()
  const { configured, user } = useAuth()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestLeadState, setGuestLeadState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [guestLeadError, setGuestLeadError] = useState<string | null>(null)

  useEffect(() => {
    if (!userType) navigate('/')
  }, [userType, navigate])

  const inputs = useMemo(() => (userType ? buildInputs() : []), [userType, buildInputs])

  const result = useMemo(() => {
    if (!userType) return null
    const assessment = { userType, reportingYear, region, inputs }
    return calculateAssessment(assessment, EMISSION_FACTORS, expectedSlotsFor(userType))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType])

  if (!userType || !result) return null

  async function handleSave() {
    if (!user || !userType || !result) return
    setSaveState('saving')
    setSaveError(null)
    const { error } = await saveAssessment(user.id, { userType, reportingYear, region, inputs }, inputs, result)
    if (error) {
      setSaveState('error')
      setSaveError(error)
      return
    }
    setSaveState('saved')
  }

  async function handleGuestLeadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!result) return
    setGuestLeadState('sending')
    setGuestLeadError(null)
    const { error } = await submitGuestLead({
      email: guestEmail,
      displayName: guestName,
      userType: result.userType,
      reportingYear: result.reportingYear,
      region: result.region,
      totalKgCO2e: result.totalKgCO2e,
    })
    if (error) {
      setGuestLeadState('error')
      setGuestLeadError(error)
      return
    }
    setGuestLeadState('sent')
  }

  function handleExportCsv() {
    if (!result) return
    downloadCsv(`ecoverse-carbon-assessment-${result.reportingYear}.csv`, assessmentResultToCsv(result))
  }

  function handleExportPdf() {
    window.print()
  }

  return (
    <div>
      <p className="eyebrow">Your results</p>
      <h1>Estimated footprint, {result.reportingYear}</h1>

      <ResultsView
        result={result}
        afterHeader={
          configured && (
            <div className="banner info print-hide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <span>
                    {saveState === 'saved'
                      ? 'Saved to your account.'
                      : saveState === 'error'
                        ? `Could not save: ${saveError}`
                        : 'Save this assessment to come back to it later.'}
                  </span>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={handleSave}
                    disabled={saveState === 'saving' || saveState === 'saved'}
                  >
                    {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save assessment'}
                  </button>
                </>
              ) : (
                <div style={{ display: 'grid', gap: 10, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>Sign in to save this assessment and view it later.</span>
                    <button type="button" className="button secondary" onClick={() => navigate('/account')}>
                      Sign in
                    </button>
                  </div>
                  {guestLeadState === 'sent' ? (
                    <span style={{ fontSize: '0.9rem' }}>
                      Sent — we've noted your result. No account was created.
                    </span>
                  ) : (
                    <form
                      onSubmit={handleGuestLeadSubmit}
                      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>Prefer not to sign in? Leave your email for a copy:</span>
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', maxWidth: 160 }}
                      />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', maxWidth: 220 }}
                      />
                      <button type="submit" className="button secondary" disabled={guestLeadState === 'sending'}>
                        {guestLeadState === 'sending' ? 'Sending…' : 'Send me a copy'}
                      </button>
                      {guestLeadState === 'error' && (
                        <span style={{ fontSize: '0.85rem' }}>Could not send: {guestLeadError}</span>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        }
        actions={
          <>
            <button type="button" className="button secondary" onClick={() => navigate('/assessment')}>
              Edit answers
            </button>
            <button type="button" className="button secondary" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button type="button" className="button secondary" onClick={handleExportPdf}>
              Export PDF
            </button>
            <button type="button" className="button secondary" onClick={() => navigate('/methodology')}>
              View methodology
            </button>
          </>
        }
      />
    </div>
  )
}
