import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import SurveyPage from './pages/SurveyPage'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
      </Routes>
    </Layout>
  )
}

export default App