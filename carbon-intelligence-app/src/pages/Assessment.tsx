import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../state/assessmentStore'
import { QUESTIONNAIRES } from '../lib/data/category-manifest'
import type { CategoryField } from '../lib/data/category-manifest'

function FieldRow({ field }: { field: CategoryField }) {
  const { answers, setAnswer, clearAnswer } = useAssessment()
  const answer = answers[field.category]

  const selectedOption = field.options?.find((o) => o.category === answer?.resolvedCategory)
  const unit = field.options ? selectedOption?.unit : field.unit

  function handleOptionChange(optionCategory: string) {
    const option = field.options?.find((o) => o.category === optionCategory)
    if (!option) return
    setAnswer(field.category, {
      quantity: answer?.quantity ?? null,
      unit: option.unit,
      resolvedCategory: option.category,
    })
  }

  function handleQuantityChange(raw: string) {
    if (raw === '') {
      clearAnswer(field.category)
      return
    }
    const quantity = Number(raw)
    const resolvedCategory = field.options ? (answer?.resolvedCategory ?? field.options[0].category) : field.category
    const resolvedUnit = field.options
      ? (field.options.find((o) => o.category === resolvedCategory)?.unit ?? field.unit)
      : field.unit
    setAnswer(field.category, { quantity, unit: resolvedUnit, resolvedCategory })
  }

  return (
    <div className="field-row">
      <div className="field-label-wrap">
        <span className="field-label">{field.label}</span>
        {field.helpText && (
          <span className="field-tooltip" tabIndex={0}>
            i<span className="tooltip-text">{field.helpText}</span>
          </span>
        )}
      </div>

      {field.options ? (
        <select
          value={answer?.resolvedCategory ?? ''}
          onChange={(e) => handleOptionChange(e.target.value)}
        >
          <option value="" disabled>
            Choose...
          </option>
          {field.options.map((o) => (
            <option key={o.category} value={o.category}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <span />
      )}

      <input
        type="number"
        min={0}
        step="any"
        placeholder="Not sure? Leave blank"
        value={answer?.quantity ?? ''}
        onChange={(e) => handleQuantityChange(e.target.value)}
        disabled={field.options ? !answer?.resolvedCategory : false}
      />
      <span className="field-unit" style={{ gridColumn: field.options ? undefined : '3' }}>
        {unit ?? ''}
      </span>
    </div>
  )
}

export function Assessment() {
  const navigate = useNavigate()
  const { userType, reportingYear, region } = useAssessment()
  const [stepIndex, setStepIndex] = useState(0)

  const sections = userType ? (QUESTIONNAIRES[userType] ?? []) : []

  useEffect(() => {
    if (!userType) navigate('/')
  }, [userType, navigate])

  if (!userType || sections.length === 0) return null

  const section = sections[stepIndex]
  const isLast = stepIndex === sections.length - 1

  return (
    <div>
      <div className="progress-label">
        <span>
          Step {stepIndex + 1} of {sections.length}
        </span>
        <span>
          Reporting year {reportingYear} · Region {region}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${((stepIndex + 1) / sections.length) * 100}%` }}
        />
      </div>

      <div className="section-card">
        <h2>{section.title}</h2>
        {section.description && <p className="section-description">{section.description}</p>}
        {section.fields.map((field) => (
          <FieldRow key={field.category} field={field} />
        ))}
      </div>

      <div className="assessment-actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => (stepIndex === 0 ? navigate('/') : setStepIndex((i) => i - 1))}
        >
          Back
        </button>
        {isLast ? (
          <button type="button" className="button primary" onClick={() => navigate('/results')}>
            Calculate my results
          </button>
        ) : (
          <button type="button" className="button primary" onClick={() => setStepIndex((i) => i + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  )
}
