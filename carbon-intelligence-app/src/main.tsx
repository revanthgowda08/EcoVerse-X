import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles/tokens.css'
import App from './App.tsx'

// HashRouter, not BrowserRouter: this app deploys as static files on
// GitHub Pages with no server-side SPA fallback configured. A direct
// navigation to e.g. /carbon-intelligence/missions (a bookmark, a
// shared link, or just hitting refresh) would 404 under BrowserRouter
// — GitHub Pages serves the main site's own 404.html for any
// unmatched path, so the app would never even load. HashRouter keeps
// the route entirely in the URL fragment (/carbon-intelligence/#/missions),
// which the server never sees, so every route always resolves to this
// same index.html. Confirmed via a real Playwright test against the
// built output — see the commit this landed in.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
