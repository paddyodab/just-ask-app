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
  name: string
  title?: string
  description?: string
  created_at?: string
  status?: string
}

const SurveySelectorPage: React.FC = () => {
  const navigate = useNavigate()
  
  // Selection state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  const [selectedSurvey, setSelectedSurvey] = useState<string>('')
  
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
      setSelectedNamespace('')
      setSelectedSurvey('')
      setSurveys([])
    }
  }, [selectedCustomer])

  // Fetch surveys when namespace changes
  useEffect(() => {
    if (selectedCustomer && selectedNamespace) {
      fetchSurveys(selectedCustomer, selectedNamespace)
      setSelectedSurvey('')
    }
  }, [selectedCustomer, selectedNamespace])

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true)
      setError(null)
      
      // Try to fetch from backend
      const response = await fetch('/api/customers')
      
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      } else {
        // Fallback to demo customer for now
        setCustomers([
          {
            id: '1',
            name: 'Demo Restaurant Chain',
            hex: '30f8f53cf8034393b00665f664a60ddb'
          }
        ])
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      // Use demo data as fallback
      setCustomers([
        {
          id: '1',
          name: 'Demo Restaurant Chain',
          hex: '30f8f53cf8034393b00665f664a60ddb'
        }
      ])
    } finally {
      setLoadingCustomers(false)
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      setLoadingNamespaces(true)
      setError(null)
      
      // Try to fetch from backend
      const response = await fetch(`/${customerHex}/namespaces`)
      
      if (response.ok) {
        const data = await response.json()
        setNamespaces(data)
      } else {
        // Fallback to demo namespace
        setNamespaces([
          {
            id: '1',
            name: 'Restaurant Survey',
            slug: 'restaurant-survey',
            description: 'Customer dining preferences and feedback'
          }
        ])
      }
    } catch (err) {
      console.error('Error fetching namespaces:', err)
      // Use demo data as fallback
      setNamespaces([
        {
          id: '1',
          name: 'Restaurant Survey',
          slug: 'restaurant-survey',
          description: 'Customer dining preferences and feedback'
        }
      ])
    } finally {
      setLoadingNamespaces(false)
    }
  }

  const fetchSurveys = async (customerHex: string, namespaceSlug: string) => {
    try {
      setLoadingSurveys(true)
      setError(null)
      
      // Try to fetch survey list from backend
      const response = await fetch(`/${customerHex}/${namespaceSlug}/surveys`)
      
      if (response.ok) {
        const data = await response.json()
        setSurveys(data)
      } else {
        // Fallback to default survey
        setSurveys([
          {
            name: 'default',
            title: 'Default Survey',
            description: 'Standard survey configuration',
            status: 'published'
          }
        ])
      }
    } catch (err) {
      console.error('Error fetching surveys:', err)
      // Use demo data as fallback
      setSurveys([
        {
          name: 'default',
          title: 'Default Survey',
          description: 'Standard survey configuration',
          status: 'published'
        }
      ])
    } finally {
      setLoadingSurveys(false)
    }
  }

  const handleLaunchSurvey = () => {
    if (selectedCustomer && selectedNamespace && selectedSurvey) {
      // Navigate to survey page with parameters
      const params = new URLSearchParams({
        customer: selectedCustomer,
        namespace: selectedNamespace,
        survey: selectedSurvey
      })
      navigate(`/?${params.toString()}`)
    }
  }

  const canLaunch = selectedCustomer && selectedNamespace && selectedSurvey

  return (
    <div className="survey-selector-page">
      <div className="selector-container">
        <h1>Survey Launcher</h1>
        <p className="description">Select a customer, namespace, and survey to launch</p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="selector-form">
          {/* Customer Selection */}
          <div className="form-group">
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
            <div className="form-group">
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
                      {namespace.description && ` - ${namespace.description}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Survey Selection */}
          {selectedNamespace && (
            <div className="form-group">
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
                      {survey.description && ` - ${survey.description}`}
                      {survey.status && survey.status !== 'published' && ` (${survey.status})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Launch Button */}
          <div className="form-actions">
            <button
              onClick={handleLaunchSurvey}
              disabled={!canLaunch}
              className="btn btn-primary"
            >
              Launch Survey
            </button>
          </div>

          {/* Preview URL */}
          {canLaunch && (
            <div className="preview-section">
              <h3>Survey URL:</h3>
              <code className="survey-url">
                {window.location.origin}/?customer={selectedCustomer}&namespace={selectedNamespace}&survey={selectedSurvey}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SurveySelectorPage