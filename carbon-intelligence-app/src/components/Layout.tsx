import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../state/authStore'

export function Layout({ children }: { children: ReactNode }) {
  const { configured, user } = useAuth()

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        {/* router Link (stays in the app) — distinct from the plain
            <a href="/"> "Back to Ecoverse" link below, which deliberately
            leaves the app for the main site's actual domain root */}
        <Link className="app-brand" to="/">
          <span className="app-brand-mark">ECO</span>
          <span>Carbon Intelligence</span>
        </Link>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Start
          </NavLink>
          <NavLink to="/methodology" className={({ isActive }) => (isActive ? 'active' : '')}>
            Methodology
          </NavLink>
          <NavLink to="/missions" className={({ isActive }) => (isActive ? 'active' : '')}>
            Missions
          </NavLink>
          {configured && (
            <NavLink to={user ? '/history' : '/account'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {user ? 'My assessments' : 'Sign in'}
            </NavLink>
          )}
          <a href="/">Back to Ecoverse</a>
        </nav>
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">
        Ecoverse Carbon Intelligence · Estimates based on versioned, sourced emission factors —
        see the <NavLink to="/methodology">Methodology</NavLink> page. ·{' '}
        <NavLink to="/privacy">Privacy policy</NavLink>
      </footer>
    </>
  )
}
