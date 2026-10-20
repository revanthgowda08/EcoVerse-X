import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../state/assessmentStore'
import type { UserType } from '../lib/calc/types'

const USER_TYPES: { type: UserType; title: string; description: string; available: boolean }[] = [
  {
    type: 'individual',
    title: 'Individual',
    description: 'Your personal footprint — energy, transport, food, and waste.',
    available: true,
  },
  {
    type: 'household',
    title: 'Household',
    description: "Your whole home's footprint in one assessment.",
    available: true,
  },
  {
    type: 'business',
    title: 'Business or MSME',
    description: 'Scope 1, 2, and configurable Scope 3 categories.',
    available: false,
  },
  {
    type: 'campus',
    title: 'Campus or institution',
    description: 'Multi-building, multi-department reporting.',
    available: false,
  },
  {
    type: 'event',
    title: 'Event organizer',
    description: 'A single event\'s footprint, start to finish.',
    available: false,
  },
]

export function Landing() {
  const navigate = useNavigate()
  const { setUserType } = useAssessment()

  function choose(type: UserType, available: boolean) {
    if (!available) return
    setUserType(type)
    navigate('/assessment')
  }

  return (
    <div className="page-intro">
      <p className="eyebrow">Carbon Intelligence</p>
      <h1>What's your emissions picture, based on what you can actually measure?</h1>
      <p>
        Answer what you know — skip what you don't. Every number on your results page traces back
        to the activity you entered and a specific, sourced emission factor. Nothing here is
        assumed to be zero just because a question went unanswered.
      </p>

      <div className="user-type-grid">
        {USER_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            className={`user-type-card ${t.available ? '' : 'disabled'}`}
            onClick={() => choose(t.type, t.available)}
            disabled={!t.available}
            style={{ textAlign: 'left', width: '100%', font: 'inherit' }}
          >
            <h3>{t.title}</h3>
            <p>{t.available ? t.description : `${t.description} — Coming soon.`}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
