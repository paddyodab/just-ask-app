import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import SurveyPage from './pages/SurveyPage'
import SurveySelectorPage from './pages/SurveySelectorPage'
import SurveyResponsesPage from './pages/SurveyResponsesPage'
import AdminPage from './pages/AdminPage'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SurveySelectorPage />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/responses" element={<SurveyResponsesPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </Layout>
  )
}

export default App