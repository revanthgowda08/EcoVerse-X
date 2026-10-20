import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActivityInput, UserType } from '../lib/calc/types'
import { QUESTIONNAIRES } from '../lib/data/category-manifest'

export interface FieldAnswer {
  /** null = not answered yet (distinct from an explicit 0). */
  quantity: number | null
  unit: string
  /** The resolved emission-factor category — for a plain field this
   *  equals the field's own category; for an option-based field it's
   *  whichever option the user picked. */
  resolvedCategory: string
}

interface AssessmentState {
  userType: UserType | null
  reportingYear: number
  region: string
  /** Keyed by CategoryField.category (the field's slot key). */
  answers: Record<string, FieldAnswer>
}

interface AssessmentContextValue extends AssessmentState {
  setUserType: (userType: UserType) => void
  setAnswer: (fieldKey: string, answer: FieldAnswer) => void
  clearAnswer: (fieldKey: string) => void
  reset: () => void
  /** Flattens `answers` into the ActivityInput[] the calculation engine
   *  expects. Only answered fields (quantity !== null) are included —
   *  an unanswered field is simply absent, never a 0-quantity input. */
  buildInputs: () => ActivityInput[]
}

const STORAGE_KEY = 'carbon-intelligence:assessment'

const defaultState: AssessmentState = {
  userType: null,
  reportingYear: new Date().getFullYear(),
  region: 'IN',
  answers: {},
}

function loadInitialState(): AssessmentState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return { ...defaultState, ...parsed }
  } catch {
    return defaultState
  }
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssessmentState>(loadInitialState)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — the
      // assessment still works for the current page view, it just
      // won't survive a refresh. Not fatal.
    }
  }, [state])

  const value = useMemo<AssessmentContextValue>(
    () => ({
      ...state,
      setUserType: (userType) => setState((s) => ({ ...s, userType, answers: {} })),
      setAnswer: (fieldKey, answer) =>
        setState((s) => ({ ...s, answers: { ...s.answers, [fieldKey]: answer } })),
      clearAnswer: (fieldKey) =>
        setState((s) => {
          const next = { ...s.answers }
          delete next[fieldKey]
          return { ...s, answers: next }
        }),
      reset: () => setState(defaultState),
      buildInputs: () => {
        if (!state.userType) return []
        const sections = QUESTIONNAIRES[state.userType] ?? []
        const inputs: ActivityInput[] = []
        for (const section of sections) {
          for (const field of section.fields) {
            const answer = state.answers[field.category]
            if (!answer || answer.quantity === null) continue
            inputs.push({ category: answer.resolvedCategory, quantity: answer.quantity, unit: answer.unit })
          }
        }
        return inputs
      },
    }),
    [state]
  )

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>
}

export function useAssessment(): AssessmentContextValue {
  const ctx = useContext(AssessmentContext)
  if (!ctx) throw new Error('useAssessment must be used within an AssessmentProvider')
  return ctx
}
