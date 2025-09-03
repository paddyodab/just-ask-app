import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/common/LoadingSpinner'
import './SurveySelectorPage.css'

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
  survey_id: string
  name: string
  version?: string
  response_count?: number
  created_at?: string
  updated_at?: string
}

const SurveySelectorPage: React.FC = () => {
  const navigate = useNavigate()
  
  // Selection state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  
  // Loading states
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [loadingNamespaces, setLoadingNamespaces] = useState(false)
  const [loadingSurveys, setLoadingSurveys] = useState(false)
  
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
      setSurveys([])
    } else {
      setNamespaces([])
      setSurveys([])
    }
  }, [selectedCustomer])

  // Fetch surveys when namespace changes
  useEffect(() => {
    if (selectedCustomer && selectedNamespace) {
      fetchSurveys(selectedCustomer, selectedNamespace)
    } else {
      setSurveys([])
    }
  }, [selectedCustomer, selectedNamespace])

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true)
      setError(null)
      
      // Fetch from the real backend endpoint
      const response = await fetch('/api/v1/operations/customers')
      
      if (response.ok) {
        const data = await response.json()
        console.log('Customers fetched:', data)
        // Transform the response to our format - the API returns { total, customers: [...] }
        const customersList = data.customers || data
        const transformedCustomers = customersList.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          hex: customer.hex_id || customer.hex
        }))
        setCustomers(transformedCustomers)
        // Auto-select the first customer if available
        if (transformedCustomers.length > 0 && !selectedCustomer) {
          setSelectedCustomer(transformedCustomers[0].hex)
        }
      } else {
        console.warn('Failed to fetch customers, using fallback')
        // Fallback to demo customer for now
        const demoCustomers = [
          {
            id: '1',
            name: 'Demo Restaurant Chain',
            hex: '30f8f53cf8034393b00665f664a60ddb'
          }
        ]
        setCustomers(demoCustomers)
        // Auto-select the demo customer
        if (!selectedCustomer) {
          setSelectedCustomer(demoCustomers[0].hex)
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      // Use demo data as fallback
      const demoCustomers = [
        {
          id: '1',
          name: 'Demo Restaurant Chain',
          hex: '30f8f53cf8034393b00665f664a60ddb'
        }
      ]
      setCustomers(demoCustomers)
      // Auto-select the demo customer
      if (!selectedCustomer) {
        setSelectedCustomer(demoCustomers[0].hex)
      }
    } finally {
      setLoadingCustomers(false)
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      setLoadingNamespaces(true)
      setError(null)
      
      // Fetch from the real backend endpoint
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Namespaces fetched:', data)
        // Transform the response to our format - the API returns { customer, namespaces: [...] }
        const namespacesList = data.namespaces || data
        const transformedNamespaces = namespacesList.map((ns: any) => ({
          id: ns.id,
          name: ns.name,
          slug: ns.slug,
          description: ns.description
        }))
        setNamespaces(transformedNamespaces)
        // Auto-select the first namespace if available
        if (transformedNamespaces.length > 0) {
          setSelectedNamespace(transformedNamespaces[0].slug)
        }
      } else {
        console.warn('Failed to fetch namespaces, using fallback')
        // Fallback to demo namespace
        const demoNamespaces = [
          {
            id: '1',
            name: 'Restaurant Survey',
            slug: 'restaurant-survey',
            description: 'Customer dining preferences and feedback'
          }
        ]
        setNamespaces(demoNamespaces)
        // Auto-select the first namespace
        setSelectedNamespace(demoNamespaces[0].slug)
      }
    } catch (err) {
      console.error('Error fetching namespaces:', err)
      // Use demo data as fallback
      const demoNamespaces = [
        {
          id: '1',
          name: 'Restaurant Survey',
          slug: 'restaurant-survey',
          description: 'Customer dining preferences and feedback'
        }
      ]
      setNamespaces(demoNamespaces)
      // Auto-select the first namespace
      setSelectedNamespace(demoNamespaces[0].slug)
    } finally {
      setLoadingNamespaces(false)
    }
  }

  const fetchSurveys = async (customerHex: string, namespaceSlug: string) => {
    try {
      setLoadingSurveys(true)
      setError(null)
      
      // Fetch surveys from the real backend endpoint
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces/${namespaceSlug}/surveys`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Surveys fetched:', data)
        
        // Transform the response to our format - the API returns { namespace, surveys: [...] }
        const surveysList = data.surveys || data
        setSurveys(surveysList)
      } else {
        console.warn('Failed to fetch surveys, using fallback')
        // Fallback to demo survey
        setSurveys([
          {
            survey_id: 'restaurant-feedback',
            name: 'Restaurant Feedback Survey',
            version: '1.0',
            response_count: 42,
            created_at: new Date().toISOString()
          }
        ])
      }
    } catch (err) {
      console.error('Error fetching surveys:', err)
      setError('Failed to load surveys')
      // Use demo data as fallback
      setSurveys([
        {
          survey_id: 'restaurant-feedback',
          name: 'Restaurant Feedback Survey',
          version: '1.0',
          response_count: 42,
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoadingSurveys(false)
    }
  }

  const handleLaunchSurvey = (surveyId: string) => {
    if (selectedCustomer && selectedNamespace && surveyId) {
      // Navigate to survey page with parameters
      const params = new URLSearchParams({
        customer: selectedCustomer,
        namespace: selectedNamespace,
        survey: surveyId
      })
      navigate(`/survey?${params.toString()}`)
    }
  }

  return (
    <div className="survey-selector-page">
      <div className="selector-container">
        <div className="selector-header">
          <h2>Survey Launcher</h2>
          <div className="header-actions">
            <select 
              className="select-control"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Select customer...</option>
              {customers.map(customer => (
                <option key={customer.hex} value={customer.hex}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select 
              className="select-control"
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              disabled={!selectedCustomer}
            >
              <option value="">Select namespace...</option>
              {namespaces.map(namespace => (
                <option key={namespace.slug} value={namespace.slug}>
                  {namespace.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!selectedCustomer || !selectedNamespace ? (
          <div className="empty-state">
            <p>Please select a customer and namespace to view available surveys</p>
          </div>
        ) : loadingSurveys ? (
          <LoadingSpinner />
        ) : (
          <div className="surveys-grid">
            {surveys.length === 0 ? (
              <div className="empty-state">
                <p>No surveys found for this namespace</p>
                <p className="hint">Contact your administrator to add surveys</p>
              </div>
            ) : (
              surveys.map(survey => (
                <div key={survey.survey_id} className="survey-card">
                  <div className="survey-header">
                    <h3>{survey.name}</h3>
                    {survey.version && (
                      <span className="survey-version">v{survey.version}</span>
                    )}
                  </div>
                  <div className="survey-info">
                    <p className="survey-id">ID: {survey.survey_id}</p>
                    {survey.response_count !== undefined && (
                      <p className="survey-responses">
                        <strong>{survey.response_count}</strong> responses collected
                      </p>
                    )}
                    {survey.created_at && (
                      <p className="survey-date">
                        Created: {new Date(survey.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="survey-actions">
                    <button 
                      className="btn btn-primary btn-full"
                      onClick={() => handleLaunchSurvey(survey.survey_id)}
                    >
                      Take Survey →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SurveySelectorPage