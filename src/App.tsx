import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import SurveyPage from './pages/SurveyPage'
import SurveySelectorPage from './pages/SurveySelectorPage'
import AdminPage from './pages/AdminPage'
import TypeaheadTestPage from './pages/TypeaheadTestPage'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SurveySelectorPage />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/typeahead-test" element={<TypeaheadTestPage />} />
      </Routes>
    </Layout>
  )
}

export default App