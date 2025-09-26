import React, { useState, useEffect } from 'react'
import { SurveyRenderer } from '../components/Survey/SurveyRenderer'
import { setupTypeaheadMockServer } from '../mocks/typeaheadMockServer'
import travelSurvey from '../../typeahead-survey-data/travel-survey-mock.json'

export const TypeaheadTestPage: React.FC = () => {
  const [surveyComplete, setSurveyComplete] = useState(false)
  const [surveyData, setSurveyData] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    // Setup the mock server for testing
    const initMockServer = async () => {
      await setupTypeaheadMockServer()
      console.log('Typeahead test page loaded with mock data')
      setIsReady(true)
    }
    initMockServer()
  }, [])
  
  const handleSurveyComplete = (sender: any) => {
    console.log('Survey completed with data:', sender.data)
    setSurveyData(sender.data)
    setSurveyComplete(true)
  }
  
  const handleValueChanged = (sender: any, options: any) => {
    console.log('Value changed:', options.name, '=', options.value)
  }
  
  if (!isReady) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading typeahead test data...</h2>
        <p>Please wait while we set up the mock server.</p>
      </div>
    )
  }
  
  if (surveyComplete) {
    return (
      <div className="survey-complete-container">
        <h2>Survey Complete!</h2>
        <p>Thank you for testing the typeahead functionality.</p>
        <h3>Your Responses:</h3>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '500px'
        }}>
          {JSON.stringify(surveyData, null, 2)}
        </pre>
        <button 
          onClick={() => {
            setSurveyComplete(false)
            setSurveyData(null)
          }}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#19b394',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Take Survey Again
        </button>
      </div>
    )
  }
  
  return (
    <div className="typeahead-test-page">
      <div style={{ 
        padding: '20px', 
        background: '#f8f8f8', 
        borderBottom: '1px solid #ddd',
        marginBottom: '20px'
      }}>
        <h1>Typeahead Testing Page</h1>
        <p>
          This page demonstrates the typeahead functionality with large datasets.
          Try typing in the dropdown fields to see the typeahead in action!
        </p>
        <div style={{ 
          background: '#e3f2fd', 
          padding: '10px', 
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <strong>Testing Tips:</strong>
          <ul style={{ margin: '5px 0' }}>
            <li>Countries: Try typing "uni" to find United States, United Kingdom, etc.</li>
            <li>Cities: Select a country first, then search for cities in that country</li>
            <li>Airlines: Try typing "air" or airline codes like "AA", "BA"</li>
            <li>Airports: Search by city name, airport name, or IATA code</li>
          </ul>
        </div>
      </div>
      
      <div style={{ padding: '20px' }}>
        <SurveyRenderer
          surveyJson={travelSurvey}
          onComplete={handleSurveyComplete}
          onValueChanged={handleValueChanged}
        />
      </div>
    </div>
  )
}

export default TypeaheadTestPage