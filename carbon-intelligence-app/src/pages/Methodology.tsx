import { EMISSION_FACTORS, DATASET_VERSION } from '../lib/data/emission-factors'

export function Methodology() {
  return (
    <div>
      <p className="eyebrow">Methodology</p>
      <h1>How this calculator works</h1>

      <div className="page-intro">
        <p>
          Every result is <code>activity data × emission factor</code>, nothing more. We never
          estimate a missing answer as zero — a category you skip is excluded from your total and
          shown as "not answered," not folded in silently.
        </p>
        <p>
          Each emission factor is versioned, sourced, and dated. Your result records exactly which
          factor id and version were used for every category, so a historical report stays
          reproducible even after the factor dataset is later revised.
        </p>
      </div>

      <div className="banner warning">
        <strong>Pre-production notice.</strong> The factor values below are reasonable, cited
        starting points — not yet confirmed by a qualified carbon-accounting reviewer against the
        latest official publication for each one. Every row marked <em>Needs validation</em> below
        should be checked before this tool is used for any reporting that others will rely on.
      </div>

      <div className="section-card">
        <h2>Calculation boundary</h2>
        <p className="section-description">
          Individual and Household assessments currently cover: grid electricity (Scope 2);
          cooking fuel, and owned-vehicle fuel (Scope 1); and public transport, air travel, diet,
          and waste (Scope 3, as a simplified individual-level proxy — not a formal organizational
          Scope 3 inventory). Business, Campus, and Event questionnaires with full Scope 1/2/3
          category selection are planned for a follow-up release.
        </p>
      </div>

      <div className="section-card">
        <h2>Emission factor sources (dataset {DATASET_VERSION})</h2>
        <div className="factor-table-wrap">
          <table className="factor-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Factor</th>
                <th>Region</th>
                <th>Source</th>
                <th>Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {EMISSION_FACTORS.map((f) => (
                <tr key={f.id}>
                  <td>{f.category}</td>
                  <td>
                    {f.value} kgCO2e / {f.unit}
                  </td>
                  <td>{f.region}</td>
                  <td>
                    {f.sourceUrl ? (
                      <a href={f.sourceUrl} target="_blank" rel="noopener">
                        {f.source}
                      </a>
                    ) : (
                      f.source
                    )}
                    <div style={{ color: 'var(--soft-sage)', fontSize: '0.78rem', marginTop: 4 }}>
                      {f.publication}
                    </div>
                    {f.uncertainty && (
                      <div style={{ color: 'var(--amber-200)', fontSize: '0.78rem', marginTop: 4 }}>
                        {f.uncertainty}
                      </div>
                    )}
                  </td>
                  <td>{f.effectiveYear}</td>
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
      </div>

      <div className="section-card">
        <h2>What we do not do</h2>
        <p className="section-description">
          No unsupported peer rankings or comparisons. No carbon credits — the rewards program
          (EcoCoins) is a platform incentive, entirely separate from this calculation engine and
          never read by it. No AI-generated number is ever allowed to override a value this
          deterministic engine computed.
        </p>
      </div>
    </div>
  )
}
