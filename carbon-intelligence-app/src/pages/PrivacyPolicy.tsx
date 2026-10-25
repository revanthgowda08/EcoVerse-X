export function PrivacyPolicy() {
  return (
    <div>
      <p className="eyebrow">Privacy</p>
      <h1>Privacy policy</h1>
      <p style={{ color: 'var(--soft-sage)' }}>Last updated 2026-10-25.</p>

      <div className="section-card">
        <h2>What this tool collects, and why</h2>
        <p>
          The calculator itself needs no account and collects nothing beyond what stays in your own
          browser for the length of your session — you can use it fully anonymously. An account is
          only needed to save a result and revisit it later. If you create one, the following is
          stored:
        </p>
        <ul>
          <li>
            <strong>Account:</strong> your email address and an encrypted password (Supabase Auth
            handles authentication; we never see or store your plaintext password).
          </li>
          <li>
            <strong>Assessment data:</strong> the activity figures you enter (e.g. electricity
            usage, fuel consumption) and the calculated result, so it can be shown back to you as
            history.
          </li>
          <li>
            <strong>Green Missions participation:</strong> if you join a mission, the estimate and
            any evidence you submit, and the review outcome.
          </li>
          <li>
            <strong>EcoCoins ledger:</strong> a record of any platform-reward coins credited to your
            account — never your carbon-emissions data itself.
          </li>
        </ul>
      </div>

      <div className="section-card">
        <h2>Legal basis and purpose limitation</h2>
        <p>
          Data is collected only for the stated purpose — running the calculator, saving your
          results if you ask for that, and operating Green Missions if you choose to participate —
          on the basis of your consent in creating an account and using these features. It is never
          sold, and never used for advertising. It is not shared with third parties except the
          infrastructure provider that stores it (Supabase, see below) and, for a business/campus/
          event account, the organization administrators who created that account, scoped to that
          organization's own submissions only.
        </p>
      </div>

      <div className="section-card">
        <h2>Where this is stored</h2>
        <p>
          Application data is stored with <a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a>,
          a third-party database and authentication provider, hosted in the <code>ap-south-1</code>{' '}
          (Mumbai) region. Supabase acts as a data processor for the data described above; see{' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener">Supabase's own privacy policy</a>{' '}
          for how they handle it at the infrastructure level.
        </p>
      </div>

      <div className="section-card">
        <h2>Your rights, and how to exercise them yourself</h2>
        <p>
          You do not need to email anyone to exercise these — both are available directly from the{' '}
          <a href="#/account">Account page</a> once signed in:
        </p>
        <ul>
          <li>
            <strong>Access and portability:</strong> "Export my data" downloads everything this
            tool holds about you — your profile, every assessment, input, result, EcoCoins ledger
            entry, and mission participation — as a single JSON file.
          </li>
          <li>
            <strong>Erasure:</strong> "Delete my account" permanently removes your account and every
            row connected to it. This cannot be undone and takes effect immediately — there is no
            recovery grace period, so export your data first if you want to keep a copy.
          </li>
        </ul>
        <p style={{ color: 'var(--soft-sage)', fontSize: '0.88rem' }}>
          If you'd rather not use the self-service tools, you may still request access, correction,
          or deletion by contacting the team through the main{' '}
          <a href="/connect.html">Ecoverse Connect page</a>.
        </p>
      </div>

      <div className="section-card">
        <h2>Retention</h2>
        <p>
          Account and assessment data is kept until you delete it yourself, or your account is
          deleted. There is no automatic expiry — this is a deliberate choice so your historical
          footprint data stays available to you for year-over-year comparison, consistent with the
          rest of this tool's "never silently discard your data" principle. Audit-log entries
          written by admin actions (e.g. an emission-factor change) are retained independently of
          any individual user account, as an operational integrity record.
        </p>
      </div>

      <div className="section-card">
        <h2>Children</h2>
        <p>
          This tool is not directed at children and does not knowingly collect data from anyone
          under 18. If you believe a child has created an account, contact us via the Connect page
          and it will be removed.
        </p>
      </div>

      <div className="banner info">
        This policy describes this specific tool, Ecoverse Carbon Intelligence. It is not a
        substitute for formal legal review — an organization deploying this for government or
        commercial use should have this reviewed against the specific regulatory regime that
        applies to that deployment (e.g. India's Digital Personal Data Protection Act, 2023) before
        relying on it as a compliance document.
      </div>
    </div>
  )
}
