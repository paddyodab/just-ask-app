import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAdminContext } from '../../contexts/AdminContext'
import './ResponseManagement.css'

interface Customer {
  id: string
  name: string
  hex_id: string
}

interface Namespace {
  id: string
  name: string
  slug: string
}

interface Survey {
  survey_id: string
  name: string
  version?: string
  response_count?: number
}

interface SurveyResponse {
  id: string
  response_id: string
  survey_data: Record<string, any>
  submitted_at: string
  respondent_id?: string
  metadata?: Record<string, any>
}

const ResponseManagement: React.FC = () => {
  const {
    selectedCustomerId,
    selectedCustomerName,
    selectedNamespaceId,
    selectedNamespaceName,
    availableNamespaces,
    setSelectedCustomer,
    setSelectedNamespace,
    setAvailableNamespaces
  } = useAdminContext()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  
  const [selectedSurvey, setSelectedSurvey] = useState<string>('')
  
  const [surveyDefinition, setSurveyDefinition] = useState<any>(null)
  const [totalResponses, setTotalResponses] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state for viewing individual response
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomerId) {
      fetchNamespaces(selectedCustomerId)
      setSelectedSurvey('')
      setSurveys([])
      setResponses([])
    } else {
      setAvailableNamespaces([])
      setSurveys([])
      setResponses([])
    }
  }, [selectedCustomerId])

  useEffect(() => {
    if (selectedCustomerId && selectedNamespaceId) {
      fetchSurveys(selectedCustomerId, selectedNamespaceId)
      setResponses([])
    } else {
      setSurveys([])
      setResponses([])
    }
  }, [selectedCustomerId, selectedNamespaceId])

  useEffect(() => {
    if (selectedCustomerId && selectedNamespaceId && selectedSurvey) {
      fetchResponses()
      fetchSurveyDefinition()
    }
  }, [selectedCustomerId, selectedNamespaceId, selectedSurvey, currentPage, pageSize])

  // ESC key handler for closing modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDetailModal) {
        setShowDetailModal(false)
        setSelectedResponse(null)
      }
    }

    if (showDetailModal) {
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [showDetailModal])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/v1/operations/customers')
      if (response.ok) {
        const data = await response.json()
        const customersList = data.customers || []
        setCustomers(customersList)
        // Auto-select the first customer if available
        if (customersList.length > 0 && !selectedCustomerId) {
          setSelectedCustomer(customersList[0].hex_id, customersList[0].name)
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      // Demo data
      const demoCustomers = [
        {
          id: '1',
          name: 'Demo Restaurant Chain',
          hex_id: '30f8f53cf8034393b00665f664a60ddb'
        }
      ]
      setCustomers(demoCustomers)
      // Auto-select the demo customer
      if (!selectedCustomerId) {
        setSelectedCustomer(demoCustomers[0].hex_id, demoCustomers[0].name)
      }
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces`)
      if (response.ok) {
        const data = await response.json()
        const namespacesList = data.namespaces || []
        setAvailableNamespaces(namespacesList)
        // Auto-select the first namespace if available
        if (namespacesList.length > 0 && !selectedNamespaceId) {
          setSelectedNamespace(namespacesList[0].slug, namespacesList[0].name)
        }
      }
    } catch (err) {
      console.error('Error fetching namespaces:', err)
      // Demo data
      const demoNamespaces = [
        {
          id: '1',
          name: 'Restaurant Survey',
          slug: 'restaurant-survey'
        }
      ]
      setAvailableNamespaces(demoNamespaces)
      // Auto-select the first namespace
      if (!selectedNamespaceId) {
        setSelectedNamespace(demoNamespaces[0].slug, demoNamespaces[0].name)
      }
    }
  }

  const fetchSurveys = async (customerHex: string, namespaceSlug: string) => {
    try {
      const response = await fetch(
        `/api/v1/operations/customers/${customerHex}/namespaces/${namespaceSlug}/surveys`
      )
      
      if (response.ok) {
        const data = await response.json()
        const surveysList = data.surveys || []
        setSurveys(surveysList)
        // Auto-select the first survey if available
        if (surveysList.length > 0) {
          setSelectedSurvey(surveysList[0].survey_id)
        }
      }
    } catch (err) {
      console.error('Error fetching surveys:', err)
      // Demo data
      const demoSurveys = [
        {
          survey_id: 'restaurant-feedback',
          name: 'Restaurant Feedback Survey',
          version: '1.0',
          response_count: 42
        }
      ]
      setSurveys(demoSurveys)
      // Auto-select the first survey
      setSelectedSurvey(demoSurveys[0].survey_id)
    }
  }

  const fetchSurveyDefinition = async () => {
    try {
      const response = await fetch(
        `/${selectedCustomerId}/${selectedNamespaceId}/survey?survey_name=${selectedSurvey}`
      )
      
      if (response.ok) {
        const surveyData = await response.json()
        setSurveyDefinition(surveyData)
      }
    } catch (err) {
      console.error('Error fetching survey definition:', err)
    }
  }

  const fetchResponses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = `/api/v1/operations/customers/${selectedCustomerId}/namespaces/${selectedNamespaceId}/responses?page=${currentPage}&size=${pageSize}&survey_name=${selectedSurvey}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Responses fetched:', data)
        
        const responsesList = data.responses || []
        const transformedResponses = responsesList.map((resp: any) => ({
          id: resp.response_id,
          response_id: resp.response_id,
          survey_data: resp.response_data?.survey_data || resp.response_data || {},
          submitted_at: resp.submitted_at || resp.created_at,
          respondent_id: resp.respondent_id,
          metadata: resp.metadata
        }))
        
        setResponses(transformedResponses)
        setTotalResponses(data.total || 0)
      } else {
        throw new Error('Failed to fetch responses')
      }
    } catch (err) {
      console.error('Error fetching responses:', err)
      setError('Failed to load responses')
      // Demo data
      setResponses([
        {
          id: 'demo-1',
          response_id: 'demo-response-1',
          survey_data: {
            favorite_meal: 'Dinner',
            satisfaction: 'Very satisfied',
            recommend: 'Yes'
          },
          submitted_at: new Date().toISOString()
        }
      ])
      setTotalResponses(1)
    } finally {
      setLoading(false)
    }
  }

  const getFieldNames = (): string[] => {
    const fieldSet = new Set<string>()
    
    // If we have a survey definition, use its question names in order
    if (surveyDefinition && surveyDefinition.pages) {
      surveyDefinition.pages.forEach((page: any) => {
        if (page.elements) {
          page.elements.forEach((element: any) => {
            if (element.name) {
              fieldSet.add(element.name)
            }
          })
        }
      })
    }
    
    // Also add any fields from actual responses
    responses.forEach(response => {
      if (response.survey_data) {
        Object.keys(response.survey_data).forEach(key => {
          fieldSet.add(key)
        })
      }
    })
    
    return Array.from(fieldSet)
  }

  const getFieldTitle = (fieldName: string): string => {
    // Try to get the title from survey definition
    if (surveyDefinition && surveyDefinition.pages) {
      for (const page of surveyDefinition.pages) {
        if (page.elements) {
          for (const element of page.elements) {
            if (element.name === fieldName) {
              return element.title || fieldName
            }
          }
        }
      }
    }
    
    // Fallback to making the field name more readable
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatFieldValue = (value: any, fieldName?: string): string => {
    if (value === null || value === undefined) {
      return '-'
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    if (Array.isArray(value)) {
      // Check if it's an array of objects (paneldynamic)
      if (value.length > 0 && typeof value[0] === 'object') {
        // Generic format for ALL panel arrays - no hardcoding!
        return value.map((item, idx) => {
          // Get all non-null entries
          const entries = Object.entries(item)
            .filter(([_, val]) => val != null)
            .map(([key, val]) => {
              // Format the key nicely (remove underscores, capitalize)
              const formattedKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
              
              // Format the value (handle nested objects, arrays, etc.)
              let formattedValue = val
              if (typeof val === 'object') {
                if (Array.isArray(val)) {
                  formattedValue = val.join(', ')
                } else {
                  formattedValue = JSON.stringify(val)
                }
              }
              
              return `${formattedKey}: ${formattedValue}`
            })
          
          // If no entries, show empty indicator
          if (entries.length === 0) {
            return `[${idx + 1}] (empty)`
          }
          
          return `[${idx + 1}] ${entries.join(', ')}`
        }).join(' | ')
      }
      
      // Simple array of strings/numbers
      return value.join(', ')
    }
    
    if (typeof value === 'object') {
      // Format single objects
      const entries = Object.entries(value)
        .filter(([_, val]) => val != null)
        .map(([key, val]) => {
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
          return `${formattedKey}: ${val}`
        })
      return entries.join(', ')
    }
    
    return String(value)
  }

  const handleRowClick = (response: SurveyResponse) => {
    setSelectedResponse(response)
    setShowDetailModal(true)
  }

  const exportToCSV = () => {
    if (responses.length === 0) return
    
    const fieldNames = getFieldNames()
    const headers = ['Response ID', 'Submitted At', ...fieldNames.map(name => getFieldTitle(name))]
    const rows = responses.map(response => [
      response.response_id || response.id,
      new Date(response.submitted_at).toLocaleString(),
      ...fieldNames.map(name => formatFieldValue(response.survey_data?.[name], name))
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const value = String(cell || '')
        return value.includes(',') || value.includes('"') || value.includes('\n') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      }).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const survey = surveys.find(s => s.survey_id === selectedSurvey)
    const surveyName = survey?.name || selectedSurvey
    const timestamp = new Date().toISOString().split('T')[0]
    link.setAttribute('href', url)
    link.setAttribute('download', `${surveyName}_responses_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(totalResponses / pageSize)
  const fieldNames = getFieldNames()

  return (
    <div className="response-management">
      <div className="management-header">
        <h2>View Responses</h2>
        <div className="header-actions">
          <select 
            className="select-control"
            value={selectedCustomerId || ''}
            onChange={(e) => {
              const customer = customers.find(c => c.hex_id === e.target.value)
              if (customer) {
                setSelectedCustomer(customer.hex_id, customer.name)
              } else {
                setSelectedCustomer(null, null)
              }
            }}
          >
            <option value="">Select customer...</option>
            {customers.map(customer => (
              <option key={customer.hex_id} value={customer.hex_id}>
                {customer.name}
              </option>
            ))}
          </select>
          <select 
            className="select-control"
            value={selectedNamespaceId || ''}
            onChange={(e) => {
              const namespace = availableNamespaces.find(n => n.slug === e.target.value)
              if (namespace) {
                setSelectedNamespace(namespace.slug, namespace.name)
              } else {
                setSelectedNamespace(null, null)
              }
            }}
            disabled={!selectedCustomerId}
          >
            <option value="">Select namespace...</option>
            {availableNamespaces.map(namespace => (
              <option key={namespace.slug} value={namespace.slug}>
                {namespace.name}
              </option>
            ))}
          </select>
          <select 
            className="select-control"
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            disabled={!selectedNamespaceId}
          >
            <option value="">Select survey...</option>
            {surveys.map(survey => (
              <option key={survey.survey_id} value={survey.survey_id}>
                {survey.name}
              </option>
            ))}
          </select>
          {selectedSurvey && responses.length > 0 && (
            <button 
              className="btn btn-primary"
              onClick={exportToCSV}
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!selectedCustomerId || !selectedNamespaceId || !selectedSurvey ? (
        <div className="empty-state">
          <p>Please select a customer, namespace, and survey to view responses</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : responses.length > 0 ? (
        <>
          <div className="responses-controls">
            <div className="controls-left">
              <span className="control-item">
                <strong>{totalResponses}</strong> total responses
              </span>
              <span className="control-divider">|</span>
              <span className="control-item">
                Show
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="inline-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                per page
              </span>
            </div>
            <div className="controls-right">
              {totalPages > 1 && (
                <div className="inline-pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-pagination"
                  >
                    ←
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-pagination"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="responses-table">
              <thead>
                <tr>
                  <th>Response ID</th>
                  <th>Submitted At</th>
                  {fieldNames.map(fieldName => (
                    <th key={fieldName}>{getFieldTitle(fieldName)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr 
                    key={response.id || response.response_id}
                    onClick={() => handleRowClick(response)}
                    className="clickable-row"
                  >
                    <td className="response-id">
                      {response.response_id?.slice(-8) || response.id?.slice(-8)}
                    </td>
                    <td className="submitted-at">
                      {new Date(response.submitted_at).toLocaleString()}
                    </td>
                    {fieldNames.map(fieldName => (
                      <td key={fieldName} className="response-data">
                        {formatFieldValue(response.survey_data?.[fieldName], fieldName)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No responses found for this survey</p>
        </div>
      )}

      {/* Response Detail Modal */}
      {showDetailModal && selectedResponse && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>Response Details</h3>
            
            <div className="response-detail-metadata">
              <div className="metadata-row">
                <span className="metadata-label">Response ID:</span>
                <span className="metadata-value">{selectedResponse.response_id || selectedResponse.id}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Submitted:</span>
                <span className="metadata-value">{new Date(selectedResponse.submitted_at).toLocaleString()}</span>
              </div>
              {selectedResponse.respondent_id && (
                <div className="metadata-row">
                  <span className="metadata-label">Respondent ID:</span>
                  <span className="metadata-value">{selectedResponse.respondent_id}</span>
                </div>
              )}
            </div>

            <div className="response-detail-body">
              <h4>Survey Responses</h4>
              <div className="response-fields">
                {Object.entries(selectedResponse.survey_data || {}).map(([key, value]) => (
                  <div key={key} className="response-field">
                    <div className="field-label">{getFieldTitle(key)}</div>
                    <div className="field-value">{formatFieldValue(value, key)}</div>
                  </div>
                ))}
              </div>

              {selectedResponse.metadata && Object.keys(selectedResponse.metadata).length > 0 && (
                <>
                  <h4>Metadata</h4>
                  <div className="response-fields">
                    {Object.entries(selectedResponse.metadata).map(([key, value]) => (
                      <div key={key} className="response-field">
                        <div className="field-label">{key}</div>
                        <div className="field-value">{formatFieldValue(value, key)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResponseManagement