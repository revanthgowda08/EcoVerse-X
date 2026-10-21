import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../state/assessmentStore'
import { useAuth } from '../state/authStore'
import { calculateAssessment } from '../lib/calc/engine'
import { EMISSION_FACTORS } from '../lib/data/emission-factors'
import { expectedSlotsFor } from '../lib/data/category-manifest'
import { saveAssessment } from '../lib/persistAssessment'
import { assessmentResultToCsv, downloadCsv } from '../lib/exportCsv'
import { ResultsView } from '../components/ResultsView'

export function Results() {
  const navigate = useNavigate()
  const { userType, reportingYear, region, buildInputs } = useAssessment()
  const { configured, user } = useAuth()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

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

  function handleExportCsv() {
    if (!result) return
    downloadCsv(`ecoverse-carbon-assessment-${result.reportingYear}.csv`, assessmentResultToCsv(result))
  }

  return (
    <div>
      <p className="eyebrow">Your results</p>
      <h1>Estimated footprint, {result.reportingYear}</h1>

      <ResultsView
        result={result}
        afterHeader={
          configured && (
            <div className="banner info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
                <>
                  <span>Sign in to save this assessment and view it later.</span>
                  <button type="button" className="button secondary" onClick={() => navigate('/account')}>
                    Sign in
                  </button>
                </>
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
            <button type="button" className="button secondary" onClick={() => navigate('/methodology')}>
              View methodology
            </button>
          </>
        }
      />
    </div>
  )
}
