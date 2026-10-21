import { useEffect, useState } from 'react'
import { useAuth } from '../state/authStore'
import { supabase } from '../lib/supabase'

interface Mission {
  id: string
  title: string
  description: string
  category: string
  metric_unit: string
}

interface Participation {
  id: string
  mission_id: string
  status: string
  estimated_metric_value: number | null
  measured_metric_value: number | null
}

interface LedgerEntry {
  id: string
  amount: number
  status: string
  created_at: string
}

export function Missions() {
  const { configured, user } = useAuth()
  const [missions, setMissions] = useState<Mission[] | null>(null)
  const [participations, setParticipations] = useState<Record<string, Participation>>({})
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null)
  const [draftValue, setDraftValue] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('missions')
      .select('id, title, description, category, metric_unit')
      .eq('active', true)
      .then(({ data }) => setMissions((data as Mission[]) ?? []))
  }, [])

  useEffect(() => {
    if (!supabase || !user) return
    supabase
      .from('mission_participations')
      .select('id, mission_id, status, estimated_metric_value, measured_metric_value')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const byMission: Record<string, Participation> = {}
        for (const p of (data as Participation[]) ?? []) byMission[p.mission_id] = p
        setParticipations(byMission)
      })
    supabase
      .from('ecocoins_ledger')
      .select('id, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLedger((data as LedgerEntry[]) ?? []))
  }, [user])

  async function joinMission(missionId: string) {
    if (!supabase || !user) return
    const { data, error } = await supabase
      .from('mission_participations')
      .insert({ mission_id: missionId, user_id: user.id, status: 'joined' })
      .select('id, mission_id, status, estimated_metric_value, measured_metric_value')
      .single()
    if (!error && data) {
      setParticipations((prev) => ({ ...prev, [missionId]: data as Participation }))
    }
  }

  async function submitEstimate(missionId: string) {
    if (!supabase || !user) return
    const participation = participations[missionId]
    const value = Number(draftValue[missionId])
    if (!participation || !Number.isFinite(value)) return
    const { data, error } = await supabase
      .from('mission_participations')
      .update({ estimated_metric_value: value, status: 'submitted' })
      .eq('id', participation.id)
      .select('id, mission_id, status, estimated_metric_value, measured_metric_value')
      .single()
    if (!error && data) {
      setParticipations((prev) => ({ ...prev, [missionId]: data as Participation }))
    }
  }

  const approvedBalance = ledger?.filter((l) => l.status === 'approved').reduce((sum, l) => sum + l.amount, 0) ?? 0

  if (!configured) {
    return (
      <div className="page-intro">
        <p className="eyebrow">Green Missions</p>
        <h1>Not connected yet</h1>
        <p>
          Missions and EcoCoins need a connected Supabase project. See the project README for
          setup — the calculator itself works fully without this.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="eyebrow">Green Missions</p>
      <h1>Verified sustainable actions, tracked over time</h1>
      <p style={{ color: 'var(--soft-sage)' }}>
        EcoCoins are a platform reward for participating — a separate ledger from this tool's
        emissions calculations, never a carbon credit. Submissions are reviewed before coins are
        approved.
      </p>

      {user && (
        <div className="banner info">
          <strong>Your EcoCoins: {approvedBalance}</strong>
          {ledger?.some((l) => l.status === 'pending') && ' · some entries pending review'}
        </div>
      )}

      {!user && <div className="banner warning">Sign in from the Account page to join missions.</div>}

      {missions === null && <p style={{ color: 'var(--soft-sage)' }}>Loading…</p>}
      {missions?.length === 0 && <p style={{ color: 'var(--soft-sage)' }}>No active missions right now.</p>}

      {missions?.map((m) => {
        const participation = participations[m.id]
        return (
          <div className="section-card" key={m.id}>
            <h2>{m.title}</h2>
            <p className="section-description">{m.description}</p>
            {!user ? null : !participation ? (
              <button type="button" className="button primary" onClick={() => joinMission(m.id)}>
                Join this mission
              </button>
            ) : participation.status === 'joined' || participation.status === 'submitted' ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  placeholder={`Your contribution (${m.metric_unit})`}
                  value={draftValue[m.id] ?? participation.estimated_metric_value ?? ''}
                  onChange={(e) => setDraftValue((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', width: 220 }}
                />
                <button type="button" className="button secondary" onClick={() => submitEstimate(m.id)}>
                  {participation.status === 'submitted' ? 'Update submission' : 'Submit for review'}
                </button>
                <span className={`status-pill ${participation.status === 'submitted' ? 'missing' : 'ok'}`}>
                  {participation.status}
                </span>
              </div>
            ) : (
              <div>
                <span className="status-pill ok">{participation.status}</span>
                {participation.measured_metric_value !== null && (
                  <span style={{ marginLeft: 10, color: 'var(--soft-sage)' }}>
                    Verified: {participation.measured_metric_value} {m.metric_unit}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
