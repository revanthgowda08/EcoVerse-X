import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { listMyAssessments, type SavedAssessmentSummary } from '../lib/persistAssessment'

export function History() {
  const { configured, user, loading } = useAuth()
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState<SavedAssessmentSummary[] | null>(null)

  useEffect(() => {
    if (!user) return
    listMyAssessments(user.id).then(setAssessments)
  }, [user])

  useEffect(() => {
    if (configured && !loading && !user) navigate('/account')
  }, [configured, loading, user, navigate])

  if (!configured) {
    return (
      <div className="page-intro">
        <p className="eyebrow">History</p>
        <h1>Accounts aren't connected yet</h1>
        <p>See the Account page for details.</p>
      </div>
    )
  }

  if (loading || !user) return null

  return (
    <div>
      <p className="eyebrow">History</p>
      <h1>Your saved assessments</h1>

      {assessments === null && <p style={{ color: 'var(--soft-sage)' }}>Loading…</p>}
      {assessments?.length === 0 && (
        <p style={{ color: 'var(--soft-sage)' }}>
          No saved assessments yet. Run a <Link to="/">new assessment</Link> and save it from your
          results page.
        </p>
      )}

      {assessments && assessments.length > 0 && (
        <div className="section-card">
          <table className="category-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Type</th>
                <th>Region</th>
                <th>Total</th>
                <th>Saved</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>{a.reportingYear}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.userType}</td>
                  <td>{a.region}</td>
                  <td>
                    <Link to={`/history/${a.id}`}>
                      {a.totalKgCO2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO2e
                    </Link>
                  </td>
                  <td>{a.calculatedAt ? new Date(a.calculatedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
