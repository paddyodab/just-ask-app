import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Model } from 'survey-core'
import SurveyRenderer from '../components/Survey/SurveyRenderer'
import { restaurantSurvey } from '../surveys/restaurantSurvey'
import { useSubmitSurveyResponse } from '../hooks/useSurvey'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './SurveyPage.css'

const SurveyPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [surveyComplete, setSurveyComplete] = useState(false)
  const [responseId, setResponseId] = useState<string | null>(null)
  const [surveyJson, setSurveyJson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const submitResponse = useSubmitSurveyResponse()
  
  // Get configuration from URL params or use defaults
  const surveyName = searchParams.get('survey') || 'default'
  const customerHex = searchParams.get('customer') || '30f8f53cf8034393b00665f664a60ddb'
  const namespace = searchParams.get('namespace') || 'restaurant-survey'
  
  useEffect(() => {
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
          // If no survey found on backend, use the local one
          console.log(`Survey '${surveyName}' not found on backend, using local restaurant survey`)
          setSurveyJson(restaurantSurvey)
        } else {
          throw new Error(`Failed to load survey: ${response.status}`)
        }
      } catch (err) {
        console.error('Error loading survey:', err)
        // Fallback to local survey
        console.log('Using fallback local survey due to error')
        setSurveyJson(restaurantSurvey)
      } finally {
        setLoading(false)
      }
    }
    
    loadSurvey()
  }, [customerHex, namespace, surveyName])

  const handleSurveyComplete = async (sender: Model) => {
    const surveyData = sender.data
    console.log('Survey completed:', surveyData)
    
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
    return (
      <div className="survey-page">
        <div className="survey-complete">
          <h2>Thank You!</h2>
          <p>Your survey response has been successfully submitted.</p>
          <p className="response-id">Response ID: {responseId}</p>
          <button onClick={handleRestartSurvey} className="restart-button">
            Take Another Survey
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
      <div className="survey-header">
        <h1>{surveyJson.title || 'Survey'}</h1>
        <p>{surveyJson.description || ''}</p>
      </div>
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