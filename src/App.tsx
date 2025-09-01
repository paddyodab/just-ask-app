import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import SurveyPage from './pages/SurveyPage'
import SurveySelectorPage from './pages/SurveySelectorPage'
import SurveyResponsesPage from './pages/SurveyResponsesPage'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
        <Route path="/select" element={<SurveySelectorPage />} />
        <Route path="/responses" element={<SurveyResponsesPage />} />
      </Routes>
    </Layout>
  )
}

export default App