import React from 'react'
import { formatResponseValue, getFieldLabel } from '../../utils/formatSurveyResponse'
import './response-viewer.css'

interface ResponseViewerProps {
  responses: Record<string, any>
  surveyJson?: any
  responseId?: string
  submittedAt?: string
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ 
  responses, 
  surveyJson,
  responseId,
  submittedAt
}) => {
  // Group responses by page if survey JSON is available
  const groupedResponses = surveyJson ? groupResponsesByPage(responses, surveyJson) : null

  return (
    <div className="response-viewer">
      {/* Header */}
      {(responseId || submittedAt) && (
        <div className="response-header">
          <h2>Response Details</h2>
          {responseId && (
            <div className="response-meta">
              <strong>Response ID:</strong> {responseId}
            </div>
          )}
          {submittedAt && (
            <div className="response-meta">
              <strong>Submitted:</strong> {new Date(submittedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Responses */}
      <div className="response-content">
        <h3>Survey Responses</h3>
        
        {groupedResponses ? (
          // Grouped by page
          Object.entries(groupedResponses).map(([pageTitle, fields]) => (
            <div key={pageTitle} className="response-page">
              <h4>{pageTitle}</h4>
              <div className="response-fields">
                {Object.entries(fields).map(([fieldName, value]) => (
                  <ResponseField
                    key={fieldName}
                    fieldName={fieldName}
                    value={value}
                    surveyJson={surveyJson}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Flat list
          <div className="response-fields">
            {Object.entries(responses).map(([fieldName, value]) => (
              <ResponseField
                key={fieldName}
                fieldName={fieldName}
                value={value}
                surveyJson={surveyJson}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ResponseFieldProps {
  fieldName: string
  value: any
  surveyJson?: any
}

const ResponseField: React.FC<ResponseFieldProps> = ({ fieldName, value, surveyJson }) => {
  const label = getFieldLabel(fieldName, surveyJson)
  const formattedValue = formatResponseValue(value, fieldName)
  
  // Special rendering for complex fields
  const isComplex = Array.isArray(value) && value.some(item => typeof item === 'object')
  
  return (
    <div className="response-field">
      <div className="field-label">{label}:</div>
      {isComplex ? (
        <div className="field-value complex">
          {renderComplexValue(value, fieldName)}
        </div>
      ) : (
        <div className="field-value">{formattedValue}</div>
      )}
    </div>
  )
}

function renderComplexValue(value: any[], fieldName: string): React.ReactNode {
  if (fieldName === 'visited_countries') {
    return (
      <div className="panel-list">
        {value.map((panel, index) => (
          <div key={index} className="panel-item">
            <span className="panel-index">#{index + 1}</span>
            <div className="panel-content">
              {panel.country && <div>Country: <strong>{panel.country}</strong></div>}
              {panel.favorite_city && <div>Favorite City: <strong>{panel.favorite_city}</strong></div>}
              {panel.country_rating && <div>Rating: <strong>{panel.country_rating}/5</strong></div>}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (fieldName === 'bucket_list') {
    return (
      <div className="panel-list">
        {value.map((panel, index) => (
          <div key={index} className="panel-item">
            <span className="panel-index">#{index + 1}</span>
            <div className="panel-content">
              {panel.dream_country && <div>Country: <strong>{panel.dream_country}</strong></div>}
              {panel.dream_city && <div>City: <strong>{panel.dream_city}</strong></div>}
              {panel.visit_reason && <div>Reason: <strong>{panel.visit_reason}</strong></div>}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  // Generic rendering for unknown panel types
  return (
    <div className="panel-list">
      {value.map((panel, index) => (
        <div key={index} className="panel-item">
          <span className="panel-index">#{index + 1}</span>
          <div className="panel-content">
            {Object.entries(panel)
              .filter(([_, val]) => val != null)
              .map(([key, val]) => (
                <div key={key}>
                  {key}: <strong>{String(val)}</strong>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function groupResponsesByPage(responses: Record<string, any>, surveyJson: any): Record<string, Record<string, any>> {
  const grouped: Record<string, Record<string, any>> = {}
  
  // Create a map of field names to page titles
  const fieldToPage: Record<string, string> = {}
  
  surveyJson.pages?.forEach((page: any) => {
    const pageTitle = page.title || page.name
    
    const collectFields = (elements: any[]) => {
      elements?.forEach(element => {
        if (element.name) {
          fieldToPage[element.name] = pageTitle
        }
        if (element.elements) {
          collectFields(element.elements)
        }
        if (element.templateElements) {
          element.templateElements.forEach((template: any) => {
            if (template.name) {
              fieldToPage[element.name] = pageTitle // Use panel name for dynamic panels
            }
          })
        }
      })
    }
    
    collectFields(page.elements)
  })
  
  // Group responses by page
  Object.entries(responses).forEach(([fieldName, value]) => {
    const pageTitle = fieldToPage[fieldName] || 'Other'
    if (!grouped[pageTitle]) {
      grouped[pageTitle] = {}
    }
    grouped[pageTitle][fieldName] = value
  })
  
  return grouped
}

export default ResponseViewer