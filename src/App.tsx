import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import SurveyPage from './pages/SurveyPage'
import SurveySelectorPage from './pages/SurveySelectorPage'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
        <Route path="/select" element={<SurveySelectorPage />} />
      </Routes>
    </Layout>
  )
}

export default App