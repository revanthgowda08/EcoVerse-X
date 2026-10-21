import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { loadAssessmentResult } from '../lib/persistAssessment'
import { assessmentResultToCsv, downloadCsv } from '../lib/exportCsv'
import { ResultsView } from '../components/ResultsView'
import type { AssessmentResult } from '../lib/calc/types'

export function SavedResult() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [result, setResult] = useState<AssessmentResult | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    loadAssessmentResult(id).then(setResult)
  }, [id])

  if (result === undefined) return null

  if (result === null) {
    return (
      <div className="page-intro">
        <p className="eyebrow">Saved result</p>
        <h1>Not found</h1>
        <p>
          This assessment doesn't exist, or isn't yours to view. <Link to="/history">Back to your history</Link>.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="eyebrow">Saved result</p>
      <h1>
        Footprint from {result.reportingYear}
        <span style={{ fontSize: '0.5em', color: 'var(--soft-sage)', marginLeft: 12 }}>
          saved {new Date(result.calculatedAt).toLocaleDateString()}
        </span>
      </h1>
      <p className="banner info print-hide" style={{ display: 'block' }}>
        This is a frozen snapshot — it shows the exact factor versions and inputs used at the time,
        even if the live emission-factor dataset has since been revised.
      </p>

      <ResultsView
        result={result}
        actions={
          <>
            <button type="button" className="button secondary" onClick={() => navigate('/history')}>
              Back to history
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                downloadCsv(`ecoverse-carbon-assessment-${result.reportingYear}.csv`, assessmentResultToCsv(result))
              }
            >
              Export CSV
            </button>
            <button type="button" className="button secondary" onClick={() => window.print()}>
              Export PDF
            </button>
          </>
        }
      />
    </div>
  )
}
