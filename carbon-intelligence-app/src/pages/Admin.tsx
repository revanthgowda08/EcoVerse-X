import { useEffect, useState } from 'react'
import { useAuth } from '../state/authStore'
import { supabase } from '../lib/supabase'
import type { EmissionFactor, Scope } from '../lib/calc/types'

interface RewardPolicy {
  id: string
  name: string
  trigger_type: string
  amount: number
  active: boolean
  requires_evidence_review: boolean
}

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
}

const emptyFactorDraft = {
  id: '',
  category: '',
  unit: '',
  value: '',
  region: 'GLOBAL',
  scope: 'scope1' as Scope,
  source: '',
  sourceUrl: '',
  publication: '',
  effectiveYear: String(new Date().getFullYear()),
  notes: '',
  uncertainty: '',
  needsValidation: true,
}

export function Admin() {
  const { configured, user, profile, loading } = useAuth()
  const [factors, setFactors] = useState<EmissionFactor[] | null>(null)
  const [policies, setPolicies] = useState<RewardPolicy[] | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null)
  const [draft, setDraft] = useState(emptyFactorDraft)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!supabase || !isAdmin) return
    supabase
      .from('emission_factors')
      .select('*')
      .order('category')
      .order('version', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setFactors(
          data.map((r) => ({
            id: r.id,
            category: r.category,
            unit: r.unit,
            value: r.value,
            outputUnit: r.output_unit,
            region: r.region,
            scope: r.scope,
            source: r.source,
            sourceUrl: r.source_url ?? undefined,
            publication: r.publication,
            effectiveYear: r.effective_year,
            version: r.version,
            supersedes: r.supersedes ?? undefined,
            notes: r.notes ?? undefined,
            uncertainty: r.uncertainty ?? undefined,
            needsValidation: r.needs_validation,
          }))
        )
      })
    supabase
      .from('reward_policies')
      .select('id, name, trigger_type, amount, active, requires_evidence_review')
      .then(({ data }) => setPolicies((data as RewardPolicy[]) ?? []))
    supabase
      .from('audit_log')
      .select('id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data }) => setAuditLog((data as AuditEntry[]) ?? []))
  }, [isAdmin])

  async function handleAddFactorVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setFormError(null)

    const existingVersions = (factors ?? []).filter(
      (f) => f.category === draft.category && f.region === draft.region
    )
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((f) => f.version)) + 1 : 1
    const supersedes = existingVersions.find((f) => f.version === nextVersion - 1)?.id ?? null

    setSubmitting(true)
    const { error } = await supabase.from('emission_factors').insert({
      id: draft.id || `${draft.category.toUpperCase()}-${draft.region}-${draft.effectiveYear}-v${nextVersion}`,
      category: draft.category,
      unit: draft.unit,
      value: Number(draft.value),
      region: draft.region,
      scope: draft.scope,
      source: draft.source,
      source_url: draft.sourceUrl || null,
      publication: draft.publication,
      effective_year: Number(draft.effectiveYear),
      version: nextVersion,
      supersedes,
      notes: draft.notes || null,
      uncertainty: draft.uncertainty || null,
      needs_validation: draft.needsValidation,
      created_by: user?.id,
    })
    setSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }
    setDraft(emptyFactorDraft)
    // refetch
    supabase
      .from('emission_factors')
      .select('*')
      .order('category')
      .order('version', { ascending: false })
      .then(({ data }) => {
        if (data) setFactors(data as unknown as EmissionFactor[])
      })
  }

  if (!configured) {
    return (
      <div className="page-intro">
        <p className="eyebrow">Admin</p>
        <h1>Not connected yet</h1>
        <p>The admin interface needs a connected Supabase project with a profile row set to role = 'admin'.</p>
      </div>
    )
  }

  if (loading) return null

  if (!user || !isAdmin) {
    return (
      <div className="page-intro">
        <p className="eyebrow">Admin</p>
        <h1>Access denied</h1>
        <p>This area is restricted to admin accounts.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1>Emission factors, reward policies, and audit log</h1>

      <div className="section-card">
        <h2>Add a new factor version</h2>
        <p className="section-description">
          This always inserts a new row — categories/regions already in use get the next version
          number automatically, with `supersedes` pointing at the one it replaces. Existing
          historical assessment results keep referencing the version they were calculated with.
        </p>
        <form onSubmit={handleAddFactorVersion} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <label>
            Category
            <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} required />
          </label>
          <label>
            Region
            <input value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} required />
          </label>
          <label>
            Unit
            <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} required />
          </label>
          <label>
            Value (kgCO2e per unit)
            <input type="number" step="any" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} required />
          </label>
          <label>
            Scope
            <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as Scope })}>
              <option value="scope1">Scope 1</option>
              <option value="scope2">Scope 2</option>
              <option value="scope3">Scope 3</option>
            </select>
          </label>
          <label>
            Effective year
            <input type="number" value={draft.effectiveYear} onChange={(e) => setDraft({ ...draft, effectiveYear: e.target.value })} required />
          </label>
          <label>
            Source
            <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} required />
          </label>
          <label>
            Source URL
            <input value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Publication
            <input value={draft.publication} onChange={(e) => setDraft({ ...draft, publication: e.target.value })} required />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Uncertainty / data quality note
            <input value={draft.uncertainty} onChange={(e) => setDraft({ ...draft, uncertainty: e.target.value })} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={draft.needsValidation}
              onChange={(e) => setDraft({ ...draft, needsValidation: e.target.checked })}
            />
            Needs validation (uncheck only after a qualified reviewer confirms this value)
          </label>
          {formError && <div className="banner warning" style={{ gridColumn: '1 / -1' }}>{formError}</div>}
          <button type="submit" className="button primary" disabled={submitting} style={{ gridColumn: '1 / -1', justifySelf: 'start' }}>
            {submitting ? 'Saving…' : 'Add factor version'}
          </button>
        </form>
      </div>

      <div className="section-card">
        <h2>Current factors</h2>
        {factors === null ? (
          <p style={{ color: 'var(--soft-sage)' }}>Loading…</p>
        ) : (
          <div className="factor-table-wrap">
            <table className="factor-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Region</th>
                  <th>Value</th>
                  <th>Year</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f) => (
                  <tr key={f.id}>
                    <td>{f.category}</td>
                    <td>{f.region}</td>
                    <td>{f.value} / {f.unit}</td>
                    <td>{f.effectiveYear}</td>
                    <td>v{f.version}</td>
                    <td>
                      <span className={f.needsValidation ? 'status-pill missing' : 'status-pill ok'}>
                        {f.needsValidation ? 'Needs validation' : 'Validated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section-card">
        <h2>Reward policies</h2>
        {policies === null ? (
          <p style={{ color: 'var(--soft-sage)' }}>Loading…</p>
        ) : policies.length === 0 ? (
          <p style={{ color: 'var(--soft-sage)' }}>
            None yet — add rows directly to the `reward_policies` table to start awarding EcoCoins
            (e.g. for a mission category or on assessment submission).
          </p>
        ) : (
          <table className="category-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Trigger</th>
                <th>Amount</th>
                <th>Active</th>
                <th>Needs review</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.trigger_type}</td>
                  <td>{p.amount}</td>
                  <td>{p.active ? 'Yes' : 'No'}</td>
                  <td>{p.requires_evidence_review ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-card">
        <h2>Audit log (latest 25)</h2>
        {auditLog === null ? (
          <p style={{ color: 'var(--soft-sage)' }}>Loading…</p>
        ) : (
          <table className="category-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{a.entity_type} #{a.entity_id}</td>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
