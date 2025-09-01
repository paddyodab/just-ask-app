import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Model } from 'survey-core'
import SurveyRenderer from '../components/Survey/SurveyRenderer'
import { demoSurvey } from '../surveys/demoSurvey'
import { useSubmitSurveyResponse } from '../hooks/useSurvey'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './SurveyPage.css'

const SurveyPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [surveyComplete, setSurveyComplete] = useState(false)
  const [responseId, setResponseId] = useState<string | null>(null)
  const [surveyJson, setSurveyJson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const submitResponse = useSubmitSurveyResponse()
  
  // Get configuration from URL params
  const surveyName = searchParams.get('survey')
  const customerHex = searchParams.get('customer')
  const namespace = searchParams.get('namespace')
  
  useEffect(() => {
    // Check if required parameters are missing
    if (!customerHex || !namespace || !surveyName) {
      setLoading(false)
      return
    }
    
    const loadSurvey = async () => {
      try {
        // Try to fetch survey from backend with survey_name parameter
        const response = await fetch(`/${customerHex}/${namespace}/survey?survey_name=${surveyName}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Survey '${surveyName}' loaded from backend:`, data)
          // The backend returns the survey directly
          setSurveyJson(data)
        } else if (response.status === 404) {
          // If no survey found on backend, use the demo survey
          console.log(`Survey '${surveyName}' not found on backend, using demo survey`)
          setSurveyJson(demoSurvey)
        } else {
          throw new Error(`Failed to load survey: ${response.status}`)
        }
      } catch (err) {
        console.error('Error loading survey:', err)
        // Fallback to demo survey
        console.log('Using demo survey due to backend connection error')
        setSurveyJson(demoSurvey)
      } finally {
        setLoading(false)
      }
    }
    
    loadSurvey()
  }, [customerHex, namespace, surveyName])

  const handleSurveyComplete = async (sender: Model) => {
    const surveyData = sender.data
    console.log('Survey completed:', surveyData)
    
    // Check if this is the demo survey
    if (surveyJson === demoSurvey) {
      console.log('Demo survey completed - not submitting to backend')
      setResponseId(`demo-${Date.now()}`)
      setSurveyComplete(true)
      return
    }
    
    try {
      // Include the survey_name parameter in the submission URL
      const response = await fetch(`/${customerHex}/${namespace}/responses?survey_name=${surveyName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          survey_data: surveyData,
          submitted_at: new Date().toISOString(),
          // You could add more metadata here like:
          // user_agent: navigator.userAgent,
          // completion_time_seconds: sender.timeSpent,
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setResponseId(result.response_id || result.id || `resp-${Date.now()}`)
      setSurveyComplete(true)
    } catch (error) {
      console.error('Error submitting survey:', error)
      // Show a generic error message
      alert('Error submitting survey. Please try again.')
    }
  }

  const handleValueChanged = (sender: Model, options: any) => {
    // Log value changes for debugging cascading dropdowns
    console.log('Value changed:', options.name, '=', options.value)
    
    // Clear dependent fields when parent changes
    if (options.name === 'favorite_cuisine') {
      sender.setValue('visited_restaurants', null)
      sender.setValue('favorite_restaurant', null)
      sender.setValue('favorite_dishes', null)
    } else if (options.name === 'favorite_restaurant') {
      sender.setValue('favorite_dishes', null)
    }
  }

  const handleRestartSurvey = () => {
    setSurveyComplete(false)
    setResponseId(null)
  }

  // Show message if no survey parameters
  if (!customerHex || !namespace || !surveyName) {
    return (
      <div className="survey-page">
        <div className="survey-selector-prompt">
          <h2>No Survey Selected</h2>
          <p>Please select a survey to take.</p>
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-primary"
          >
            Go to Survey Selector
          </button>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="survey-page">
        <LoadingSpinner />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="survey-page">
        <div className="error-message">
          <h2>Error Loading Survey</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }
  
  if (surveyComplete && responseId) {
    const isDemo = responseId.startsWith('demo-')
    return (
      <div className="survey-page">
        <div className="survey-complete">
          <h2>{isDemo ? 'Demo Complete!' : 'Thank You!'}</h2>
          <p>
            {isDemo 
              ? 'This was a demo survey. No data was saved because the backend is not connected.'
              : 'Your survey response has been successfully submitted.'}
          </p>
          <p className="response-id">
            {isDemo ? 'Demo ID' : 'Response ID'}: {responseId}
          </p>
          <button onClick={handleRestartSurvey} className="restart-button">
            {isDemo ? 'Restart Demo' : 'Take Another Survey'}
          </button>
        </div>
      </div>
    )
  }
  
  if (!surveyJson) {
    return (
      <div className="survey-page">
        <div className="error-message">
          <h2>No Survey Available</h2>
          <p>No survey configuration found for this namespace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="survey-page">
      <div className="survey-container">
        <SurveyRenderer
          surveyJson={surveyJson}
          onComplete={handleSurveyComplete}
          onValueChanged={handleValueChanged}
        />
      </div>
    </div>
  )
}

export default SurveyPage