import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { recommendationsFor } from '../lib/recommendations'
import type { AssessmentResult, CategoryStatus } from '../lib/calc/types'

const STATUS_LABEL: Record<CategoryStatus, string> = {
  ok: 'Calculated',
  not_provided: 'Not answered',
  no_factor_found: 'No factor available',
  unit_conversion_unsupported: 'Unit not supported',
  invalid_quantity: 'Invalid value',
}

function statusPillClass(status: CategoryStatus): string {
  if (status === 'ok') return 'status-pill ok'
  if (status === 'not_provided') return 'status-pill missing'
  return 'status-pill error'
}

/**
 * Renders an AssessmentResult — used both for a just-calculated live
 * result (Results.tsx) and a frozen historical snapshot loaded back
 * from assessment_results (SavedResult.tsx). Deliberately takes the
 * already-computed result rather than recalculating, so a saved report
 * stays reproducible even if the live factor dataset changes later.
 */
export function ResultsView({
  result,
  afterHeader,
  actions,
}: {
  result: AssessmentResult
  afterHeader?: ReactNode
  actions?: ReactNode
}) {
  const recommendations = recommendationsFor(result.categories)
  const chartData = result.categories
    .filter((c) => c.status === 'ok' && (c.emissionsKgCO2e ?? 0) > 0)
    .map((c) => ({ name: c.category, kgCO2e: Math.round((c.emissionsKgCO2e ?? 0) * 100) / 100 }))
    .sort((a, b) => b.kgCO2e - a.kgCO2e)

  return (
    <div>
      <div className="results-total">
        <div>
          <span className="value">{result.totalKgCO2e.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          <span className="unit">kg CO2e</span>
        </div>
        <div>
          <span className="value" style={{ fontSize: '1.6rem' }}>
            {result.totalTonnesCO2e.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className="unit">tonnes CO2e</span>
        </div>
      </div>
      <p style={{ color: 'var(--soft-sage)', fontSize: '0.88rem' }}>
        Reporting period {result.reportingYear} · Region {result.region} · Factor set{' '}
        {result.factorSetVersion}
      </p>

      {afterHeader}

      {result.containsUnvalidatedFactors && (
        <div className="banner warning">
          This total includes one or more emission factors flagged <strong>needs validation</strong> —
          reasonable, sourced starting values that have not yet been confirmed by a qualified
          carbon-accounting reviewer against the latest official publication. See the Methodology
          page for exactly which ones.
        </div>
      )}

      <div className="banner info">
        <strong>Data completeness: {Math.round(result.completeness.completenessRatio * 100)}%</strong>{' '}
        ({result.completeness.providedCategories} of {result.completeness.totalCategories} questions
        answered). This total reflects only what you provided — unanswered categories are excluded,
        not assumed to be zero.
        <div className="completeness-bar">
          <div
            className="completeness-bar-fill"
            style={{ width: `${result.completeness.completenessRatio * 100}%` }}
          />
        </div>
        {result.completeness.missingCategories.length > 0 && (
          <span>Not yet answered: {result.completeness.missingCategories.join(', ')}.</span>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="section-card">
          <h2>Main contributors</h2>
          {/* An SVG bar chart has no text content a screen reader can use —
              role="img" + aria-label gives it one. The same numbers are
              also in the fully accessible Category breakdown table below,
              so this is a summary, not the only way to reach the data. */}
          <div
            role="img"
            aria-label={`Main contributors, highest first: ${chartData.map((c) => `${c.name}, ${c.kgCO2e} kilograms CO2e`).join('; ')}.`}
          >
            {/* No aria-hidden here: Recharts renders a focusable SVG root
                inside, and hiding an ancestor of a focusable element from
                assistive tech is its own WCAG violation (confirmed via
                axe-core's aria-hidden-focus rule) — worse than the
                redundant-announcement risk it would have prevented. The
                role="img" + aria-label on the wrapper above is the actual
                accessible description. */}
            <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 44)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" stroke="var(--soft-sage)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="var(--soft-sage)" fontSize={12} width={160} />
                <ChartTooltip
                  contentStyle={{ background: 'var(--almost-black)', border: '1px solid var(--line)' }}
                  formatter={(value) => [`${value} kg CO2e`, 'Emissions']}
                />
                <Bar dataKey="kgCO2e" fill="var(--eco-electric)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="section-card">
        <h2>Category breakdown</h2>
        <div className="factor-table-wrap">
          <table className="category-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Input</th>
                <th>Emissions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.categories.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.quantity !== null ? `${c.quantity} ${c.quantityUnit}` : '—'}</td>
                  <td>{c.emissionsKgCO2e !== null ? `${c.emissionsKgCO2e.toFixed(2)} kg CO2e` : '—'}</td>
                  <td>
                    <span className={statusPillClass(c.status)}>{STATUS_LABEL[c.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="section-card">
          <h2>Reduction opportunities</h2>
          <p className="section-description">
            Based on your actual reported categories, highest-impact first. Not AI-generated —
            fixed suggestions mapped to the category, shown alongside this engine's own numbers.
          </p>
          {recommendations.map((r) => (
            <div className="recommendation-card" key={r.category}>
              <h4>{r.title}</h4>
              <p style={{ margin: 0, color: 'var(--soft-sage)', fontSize: '0.88rem' }}>{r.assumption}</p>
              <div className="recommendation-meta">
                <span>Estimated savings: {r.estimatedSavingsKgCO2e}</span>
                <span>Cost: {r.costImplication}</span>
                <span>Timeframe: {r.timeframe}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="assessment-actions">{actions}</div>}
    </div>
  )
}
