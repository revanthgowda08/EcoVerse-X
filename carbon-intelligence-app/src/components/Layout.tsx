import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="app-header">
        <a className="app-brand" href="/">
          <span className="app-brand-mark">ECO</span>
          <span>Carbon Intelligence</span>
        </a>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Start
          </NavLink>
          <NavLink to="/methodology" className={({ isActive }) => (isActive ? 'active' : '')}>
            Methodology
          </NavLink>
          <a href="/">Back to Ecoverse</a>
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        Ecoverse Carbon Intelligence · Estimates based on versioned, sourced emission factors —
        see the <NavLink to="/methodology">Methodology</NavLink> page.
      </footer>
    </>
  )
}
