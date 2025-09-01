import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import './SurveyManagement.css'

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
  created_at?: string
  updated_at?: string
}

const SurveyManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingSurvey, setViewingSurvey] = useState<any>(null)
  const [uploadData, setUploadData] = useState({
    surveyId: '',
    name: '',
    version: '1.0',
    jsonFile: null as File | null,
    jsonContent: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchNamespaces(selectedCustomer)
      setSelectedNamespace('')
      setSurveys([])
    } else {
      setNamespaces([])
      setSurveys([])
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (selectedCustomer && selectedNamespace) {
      fetchSurveys(selectedCustomer, selectedNamespace)
    } else {
      setSurveys([])
    }
  }, [selectedCustomer, selectedNamespace])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/v1/operations/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      // Demo data
      setCustomers([
        {
          id: '1',
          name: 'Demo Restaurant Chain',
          hex_id: '30f8f53cf8034393b00665f664a60ddb'
        }
      ])
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces`)
      if (response.ok) {
        const data = await response.json()
        setNamespaces(data.namespaces || [])
      }
    } catch (err) {
      console.error('Error fetching namespaces:', err)
      // Demo data
      setNamespaces([
        {
          id: '1',
          name: 'Restaurant Survey',
          slug: 'restaurant-survey'
        }
      ])
    }
  }

  const fetchSurveys = async (customerHex: string, namespaceSlug: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(
        `/api/v1/operations/customers/${customerHex}/namespaces/${namespaceSlug}/surveys`
      )
      
      if (response.ok) {
        const data = await response.json()
        setSurveys(data.surveys || [])
      } else {
        throw new Error('Failed to fetch surveys')
      }
    } catch (err) {
      console.error('Error fetching surveys:', err)
      setError('Failed to load surveys')
      // Demo data
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
      setLoading(false)
    }
  }

  const handleUploadSurvey = async () => {
    if (!uploadData.surveyId || !uploadData.name || (!uploadData.jsonFile && !uploadData.jsonContent)) {
      return
    }

    try {
      setUploading(true)
      setError(null)
      
      let surveyJson
      if (uploadData.jsonFile) {
        const fileContent = await uploadData.jsonFile.text()
        surveyJson = JSON.parse(fileContent)
      } else {
        surveyJson = JSON.parse(uploadData.jsonContent)
      }
      
      const formData = new FormData()
      formData.append('survey_id', uploadData.surveyId)
      formData.append('name', uploadData.name)
      formData.append('version', uploadData.version)
      formData.append('survey_json', JSON.stringify(surveyJson))
      
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomer}/namespaces/${selectedNamespace}/surveys/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        await fetchSurveys(selectedCustomer, selectedNamespace)
        setUploadData({ surveyId: '', name: '', version: '1.0', jsonFile: null, jsonContent: '' })
        setShowUploadModal(false)
      } else {
        throw new Error('Failed to upload survey')
      }
    } catch (err) {
      console.error('Error uploading survey:', err)
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format in survey definition')
      } else {
        setError('Failed to upload survey')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleViewSurvey = async (survey: Survey) => {
    try {
      const response = await fetch(
        `/${selectedCustomer}/${selectedNamespace}/survey?survey_name=${survey.survey_id}`
      )
      if (response.ok) {
        const data = await response.json()
        setViewingSurvey(data)
        setShowViewModal(true)
      }
    } catch (err) {
      console.error('Error fetching survey details:', err)
      // Show basic info if can't fetch full details
      setViewingSurvey({
        title: survey.name,
        survey_id: survey.survey_id,
        version: survey.version
      })
      setShowViewModal(true)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadData({ ...uploadData, jsonFile: e.target.files[0], jsonContent: '' })
    }
  }

  const downloadSampleSurvey = () => {
    const sampleSurvey = {
      title: "Sample Survey",
      description: "This is a sample survey template",
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "text",
              name: "question1",
              title: "What is your name?",
              isRequired: true
            },
            {
              type: "radiogroup",
              name: "question2",
              title: "How satisfied are you?",
              choices: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"]
            }
          ]
        }
      ]
    }
    
    const blob = new Blob([JSON.stringify(sampleSurvey, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_survey.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="survey-management">
      <div className="management-header">
        <h2>Survey Management</h2>
        <div className="header-actions">
          <select 
            className="select-control"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
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
          <button 
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
            disabled={!selectedCustomer || !selectedNamespace}
          >
            📝 Upload Survey
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!selectedCustomer || !selectedNamespace ? (
        <div className="empty-state">
          <p>Please select a customer and namespace to manage surveys</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="surveys-grid">
          {surveys.length === 0 ? (
            <div className="empty-state">
              <p>No surveys found</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                Upload first survey
              </button>
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
                      <strong>{survey.response_count}</strong> responses
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
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleViewSurvey(survey)}
                  >
                    View
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => window.open(`/survey?customer=${selectedCustomer}&namespace=${selectedNamespace}&survey=${survey.survey_id}`, '_blank')}
                  >
                    Preview
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>Upload Survey Definition</h3>
            
            <div className="form-group">
              <label htmlFor="surveyId">Survey ID</label>
              <input
                id="surveyId"
                type="text"
                className="form-control"
                value={uploadData.surveyId}
                onChange={(e) => setUploadData({ ...uploadData, surveyId: e.target.value })}
                placeholder="e.g., customer-feedback"
              />
              <small>Unique identifier for this survey</small>
            </div>

            <div className="form-group">
              <label htmlFor="surveyName">Survey Name</label>
              <input
                id="surveyName"
                type="text"
                className="form-control"
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                placeholder="e.g., Customer Feedback Survey"
              />
            </div>

            <div className="form-group">
              <label htmlFor="surveyVersion">Version (Optional)</label>
              <input
                id="surveyVersion"
                type="text"
                className="form-control"
                value={uploadData.version}
                onChange={(e) => setUploadData({ ...uploadData, version: e.target.value })}
                placeholder="e.g., 1.0"
              />
            </div>

            <div className="form-group">
              <label>Survey Definition (JSON)</label>
              <div className="upload-options">
                <div className="upload-option">
                  <label htmlFor="jsonFile">Upload JSON File</label>
                  <input
                    id="jsonFile"
                    type="file"
                    accept=".json"
                    className="form-control"
                    onChange={handleFileChange}
                  />
                  {uploadData.jsonFile && (
                    <small>Selected: {uploadData.jsonFile.name}</small>
                  )}
                </div>
                <div className="divider">OR</div>
                <div className="upload-option">
                  <label htmlFor="jsonContent">Paste JSON Content</label>
                  <textarea
                    id="jsonContent"
                    className="form-control code-input"
                    value={uploadData.jsonContent}
                    onChange={(e) => setUploadData({ ...uploadData, jsonContent: e.target.value, jsonFile: null })}
                    placeholder='{"title": "Survey Title", "pages": [...]}'
                    rows={10}
                    disabled={!!uploadData.jsonFile}
                  />
                </div>
              </div>
            </div>

            <div className="sample-section">
              <button 
                className="btn btn-sm btn-secondary"
                onClick={downloadSampleSurvey}
              >
                📥 Download Sample Survey
              </button>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadData({ surveyId: '', name: '', version: '1.0', jsonFile: null, jsonContent: '' })
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUploadSurvey}
                disabled={uploading || !uploadData.surveyId || !uploadData.name || (!uploadData.jsonFile && !uploadData.jsonContent)}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingSurvey && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>Survey Definition</h3>
            <div className="survey-details">
              <div className="detail-row">
                <strong>Title:</strong> {viewingSurvey.title || viewingSurvey.name}
              </div>
              <div className="detail-row">
                <strong>ID:</strong> {viewingSurvey.survey_id}
              </div>
              {viewingSurvey.version && (
                <div className="detail-row">
                  <strong>Version:</strong> {viewingSurvey.version}
                </div>
              )}
              {viewingSurvey.description && (
                <div className="detail-row">
                  <strong>Description:</strong> {viewingSurvey.description}
                </div>
              )}
              <div className="json-preview">
                <h4>JSON Structure:</h4>
                <pre>{JSON.stringify(viewingSurvey, null, 2)}</pre>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowViewModal(false)}
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

export default SurveyManagement