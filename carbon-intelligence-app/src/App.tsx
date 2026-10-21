import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AssessmentProvider } from './state/assessmentStore'
import { AuthProvider } from './state/authStore'
import { Landing } from './pages/Landing'
import { Assessment } from './pages/Assessment'
import { Results } from './pages/Results'
import { Methodology } from './pages/Methodology'
import { Account } from './pages/Account'
import { History } from './pages/History'
import { SavedResult } from './pages/SavedResult'
import { Admin } from './pages/Admin'
import { Missions } from './pages/Missions'
import './styles/app.css'

function App() {
  return (
    <AuthProvider>
      <AssessmentProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/results" element={<Results />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/account" element={<Account />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<SavedResult />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Layout>
      </AssessmentProvider>
    </AuthProvider>
  )
}

export default App
