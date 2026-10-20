import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AssessmentProvider } from './state/assessmentStore'
import { Landing } from './pages/Landing'
import { Assessment } from './pages/Assessment'
import { Results } from './pages/Results'
import { Methodology } from './pages/Methodology'
import './styles/app.css'

function App() {
  return (
    <AssessmentProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/results" element={<Results />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </Layout>
    </AssessmentProvider>
  )
}

export default App
