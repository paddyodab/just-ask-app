import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './SurveyResponsesPage.css'

interface Customer {
  id: string
  name: string
  hex: string
}

interface Namespace {
  id: string
  name: string
  slug: string
  description?: string
}

interface Survey {
  name: string
  title?: string
  description?: string
  created_at?: string
  status?: string
}

interface SurveyResponse {
  id: string
  response_id: string
  survey_data: Record<string, any>
  submitted_at: string
  respondent_id?: string
  metadata?: Record<string, any>
}

interface ResponsesData {
  total: number
  page: number
  size: number
  responses: SurveyResponse[]
}

const SurveyResponsesPage: React.FC = () => {
  // Selection state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  const [selectedSurvey, setSelectedSurvey] = useState<string>('')
  
  // Response data
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Survey definition for understanding the questions
  const [surveyDefinition, setSurveyDefinition] = useState<any>(null)
  
  // Loading states
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [loadingNamespaces, setLoadingNamespaces] = useState(false)
  const [loadingSurveys, setLoadingSurveys] = useState(false)
  const [loadingResponses, setLoadingResponses] = useState(false)
  
  // Error states
  const [error, setError] = useState<string | null>(null)

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers()
  }, [])

  // Fetch namespaces when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchNamespaces(selectedCustomer)
      setSelectedNamespace('')
      setSelectedSurvey('')
      setSurveys([])
      setResponses([])
      setSurveyDefinition(null)
    }
  }, [selectedCustomer])

  // Fetch surveys when namespace changes
  useEffect(() => {
    if (selectedCustomer && selectedNamespace) {
      fetchSurveys(selectedCustomer, selectedNamespace)
      setSelectedSurvey('')
      setResponses([])
      setSurveyDefinition(null)
    }
  }, [selectedCustomer, selectedNamespace])

  // Fetch responses when survey is selected or page changes
  useEffect(() => {
    if (selectedCustomer && selectedNamespace && selectedSurvey) {
      fetchResponses()
      fetchSurveyDefinition()
    }
  }, [selectedCustomer, selectedNamespace, selectedSurvey, currentPage, pageSize])

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true)
      setError(null)
      
      const response = await fetch('/api/v1/operations/customers')
      
      if (response.ok) {
        const data = await response.json()
        const customersList = data.customers || data
        const transformedCustomers = customersList.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          hex: customer.hex_id || customer.hex
        }))
        setCustomers(transformedCustomers)
      } else {
        setCustomers([{
          id: '1',
          name: 'Demo Restaurant Chain',
          hex: '30f8f53cf8034393b00665f664a60ddb'
        }])
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setCustomers([{
        id: '1',
        name: 'Demo Restaurant Chain',
        hex: '30f8f53cf8034393b00665f664a60ddb'
      }])
    } finally {
      setLoadingCustomers(false)
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      setLoadingNamespaces(true)
      setError(null)
      
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces`)
      
      if (response.ok) {
        const data = await response.json()
        const namespacesList = data.namespaces || data
        const transformedNamespaces = namespacesList.map((ns: any) => ({
          id: ns.id,
          name: ns.name,
          slug: ns.slug,
          description: ns.description
        }))
        setNamespaces(transformedNamespaces)
      } else {
        setNamespaces([{
          id: '1',
          name: 'Restaurant Survey',
          slug: 'restaurant-survey',
          description: 'Customer dining preferences and feedback'
        }])
      }
    } catch (err) {
      console.error('Error fetching namespaces:', err)
      setNamespaces([{
        id: '1',
        name: 'Restaurant Survey',
        slug: 'restaurant-survey',
        description: 'Customer dining preferences and feedback'
      }])
    } finally {
      setLoadingNamespaces(false)
    }
  }

  const fetchSurveys = async (customerHex: string, namespaceSlug: string) => {
    try {
      setLoadingSurveys(true)
      setError(null)
      
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces/${namespaceSlug}/surveys`)
      
      if (response.ok) {
        const data = await response.json()
        const surveysList = data.surveys || data
        
        if (Array.isArray(surveysList) && surveysList.length > 0) {
          const transformedSurveys = surveysList.map((survey: any) => ({
            name: survey.survey_id,
            title: survey.name || 'Untitled Survey',
            description: `Version ${survey.version || '1.0'} - ${survey.response_count || 0} responses`,
            status: survey.updated_at ? 'updated' : 'published',
            created_at: survey.created_at
          }))
          setSurveys(transformedSurveys)
        } else {
          setSurveys([{
            name: 'default',
            title: 'Default Survey',
            description: 'Standard survey configuration',
            status: 'published'
          }])
        }
      } else {
        setSurveys([{
          name: 'default',
          title: 'Default Survey',
          description: 'Standard survey configuration',
          status: 'published'
        }])
      }
    } catch (err) {
      console.error('Error fetching surveys:', err)
      setSurveys([{
        name: 'default',
        title: 'Default Survey',
        description: 'Standard survey configuration',
        status: 'published'
      }])
    } finally {
      setLoadingSurveys(false)
    }
  }

  const fetchSurveyDefinition = async () => {
    try {
      // Fetch the survey definition to understand the questions
      const response = await fetch(`/${selectedCustomer}/${selectedNamespace}/survey?survey_name=${selectedSurvey}`)
      
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
      setLoadingResponses(true)
      setError(null)
      
      // Include survey_name parameter to filter responses for specific survey
      const url = `/api/v1/operations/customers/${selectedCustomer}/namespaces/${selectedNamespace}/responses?page=${currentPage}&size=${pageSize}&survey_name=${selectedSurvey}`
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data: any = await response.json()
        console.log('Responses fetched:', data)
        
        // Handle the response structure - responses are in data.responses
        const responsesList = data.responses || []
        
        // Transform the response data structure
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
        console.error('Failed to fetch responses:', response.status)
        setResponses([])
        setError('Failed to fetch responses')
      }
    } catch (err) {
      console.error('Error fetching responses:', err)
      setResponses([])
      setError('Error fetching responses')
    } finally {
      setLoadingResponses(false)
    }
  }

  // Extract all unique field names from responses
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
    
    // Also add any fields from actual responses that might not be in the definition
    responses.forEach(response => {
      if (response.survey_data) {
        Object.keys(response.survey_data).forEach(key => {
          fieldSet.add(key)
        })
      }
    })
    
    return Array.from(fieldSet)
  }

  // Get display title for a field
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

  // Format a field value for display
  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '-'
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    
    return String(value)
  }

  const exportToCSV = () => {
    if (responses.length === 0) return
    
    const headers = ['Response ID', 'Submitted At', ...fieldNames.map(name => getFieldTitle(name))]
    const rows = responses.map(response => [
      response.response_id || response.id,
      new Date(response.submitted_at).toLocaleString(),
      ...fieldNames.map(name => formatFieldValue(response.survey_data?.[name]))
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
    
    const surveyTitle = surveys.find(s => s.name === selectedSurvey)?.title || selectedSurvey
    const timestamp = new Date().toISOString().split('T')[0]
    link.setAttribute('href', url)
    link.setAttribute('download', `${surveyTitle}_responses_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(totalResponses / pageSize)
  const fieldNames = getFieldNames()

  return (
    <div className="survey-responses-page">
      <div className="responses-container">
        <h1>Survey Responses</h1>
        <p className="description">View and analyze survey responses</p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="selector-section">
          {/* Customer Selection */}
          <div className="selector-group">
            <label htmlFor="customer">Customer</label>
            {loadingCustomers ? (
              <LoadingSpinner />
            ) : (
              <select
                id="customer"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="form-control"
              >
                <option value="">Select a customer...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.hex}>
                    {customer.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Namespace Selection */}
          {selectedCustomer && (
            <div className="selector-group">
              <label htmlFor="namespace">Namespace</label>
              {loadingNamespaces ? (
                <LoadingSpinner />
              ) : (
                <select
                  id="namespace"
                  value={selectedNamespace}
                  onChange={(e) => setSelectedNamespace(e.target.value)}
                  className="form-control"
                >
                  <option value="">Select a namespace...</option>
                  {namespaces.map((namespace) => (
                    <option key={namespace.id} value={namespace.slug}>
                      {namespace.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Survey Selection */}
          {selectedNamespace && (
            <div className="selector-group">
              <label htmlFor="survey">Survey</label>
              {loadingSurveys ? (
                <LoadingSpinner />
              ) : (
                <select
                  id="survey"
                  value={selectedSurvey}
                  onChange={(e) => setSelectedSurvey(e.target.value)}
                  className="form-control"
                >
                  <option value="">Select a survey...</option>
                  {surveys.map((survey) => (
                    <option key={survey.name} value={survey.name}>
                      {survey.title || survey.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Responses Table */}
        {selectedSurvey && (
          <div className="responses-section">
            {loadingResponses ? (
              <LoadingSpinner />
            ) : responses.length > 0 ? (
              <>
                <div className="responses-header">
                  <h2>Responses ({totalResponses} total)</h2>
                  <div className="header-controls">
                    <button onClick={exportToCSV} className="export-btn">
                      Export to CSV
                    </button>
                    <div className="pagination-controls">
                      <label>
                        Show:
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value))
                            setCurrentPage(1)
                          }}
                          className="page-size-select"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </label>
                    </div>
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
                        <tr key={response.id || response.response_id}>
                          <td className="response-id">
                            {response.response_id?.slice(-8) || response.id?.slice(-8)}
                          </td>
                          <td className="submitted-at">
                            {new Date(response.submitted_at).toLocaleString()}
                          </td>
                          {fieldNames.map(fieldName => (
                            <td key={fieldName} className="response-data">
                              {formatFieldValue(response.survey_data?.[fieldName])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-responses">
                <p>No responses found for this survey.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SurveyResponsesPage