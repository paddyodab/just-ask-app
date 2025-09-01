import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import './LookupManagement.css'

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

interface Lookup {
  name: string
  type: 'list' | 'key_value'
  count?: number
  created_at?: string
  updated_at?: string
}

const LookupManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [lookups, setLookups] = useState<Lookup[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    lookupName: '',
    lookupType: 'key_value' as 'list' | 'key_value',
    csvFile: null as File | null
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchNamespaces(selectedCustomer)
      setSelectedNamespace('')
      setLookups([])
    } else {
      setNamespaces([])
      setLookups([])
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (selectedCustomer && selectedNamespace) {
      fetchLookups(selectedCustomer, selectedNamespace)
    } else {
      setLookups([])
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

  const fetchLookups = async (customerHex: string, namespaceSlug: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(
        `/api/v1/operations/customers/${customerHex}/namespaces/${namespaceSlug}/lookups`
      )
      
      if (response.ok) {
        const data = await response.json()
        setLookups(data.lookups || [])
      } else {
        throw new Error('Failed to fetch lookups')
      }
    } catch (err) {
      console.error('Error fetching lookups:', err)
      setError('Failed to load lookup data')
      // Demo data
      setLookups([
        {
          name: 'cuisine-types',
          type: 'key_value',
          count: 15,
          created_at: new Date().toISOString()
        },
        {
          name: 'price-ranges',
          type: 'list',
          count: 5,
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleUploadCSV = async () => {
    if (!uploadData.lookupName || !uploadData.csvFile) return

    try {
      setUploading(true)
      setError(null)
      
      const formData = new FormData()
      formData.append('lookup_name', uploadData.lookupName)
      formData.append('lookup_type', uploadData.lookupType)
      formData.append('file', uploadData.csvFile)
      
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomer}/namespaces/${selectedNamespace}/lookups/upload-csv`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        await fetchLookups(selectedCustomer, selectedNamespace)
        setUploadData({ lookupName: '', lookupType: 'key_value', csvFile: null })
        setShowUploadModal(false)
      } else {
        throw new Error('Failed to upload CSV')
      }
    } catch (err) {
      console.error('Error uploading CSV:', err)
      setError('Failed to upload CSV file')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteLookup = async (lookup: Lookup) => {
    if (!confirm(`Delete lookup "${lookup.name}"? This will affect surveys using this data.`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomer}/namespaces/${selectedNamespace}/lookups/${lookup.name}`,
        {
          method: 'DELETE'
        }
      )

      if (response.ok) {
        setLookups(lookups.filter(l => l.name !== lookup.name))
      } else {
        throw new Error('Failed to delete lookup')
      }
    } catch (err) {
      console.error('Error deleting lookup:', err)
      setError('Failed to delete lookup')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadData({ ...uploadData, csvFile: e.target.files[0] })
    }
  }

  const downloadSampleCSV = (type: 'list' | 'key_value') => {
    let content = ''
    let filename = ''
    
    if (type === 'key_value') {
      content = 'key,value\nitalian,Italian Cuisine\nchinese,Chinese Cuisine\nmexican,Mexican Cuisine'
      filename = 'sample_key_value.csv'
    } else {
      content = 'value\nOption 1\nOption 2\nOption 3'
      filename = 'sample_list.csv'
    }
    
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="lookup-management">
      <div className="management-header">
        <h2>Lookup Data Management</h2>
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
            📤 Upload CSV
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
          <p>Please select a customer and namespace to manage lookup data</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="lookups-grid">
          {lookups.length === 0 ? (
            <div className="empty-state">
              <p>No lookup data found</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                Upload first CSV
              </button>
            </div>
          ) : (
            lookups.map(lookup => (
              <div key={lookup.name} className="lookup-card">
                <div className="lookup-header">
                  <h3>{lookup.name}</h3>
                  <span className={`lookup-type ${lookup.type}`}>
                    {lookup.type === 'key_value' ? 'Key-Value' : 'List'}
                  </span>
                </div>
                <div className="lookup-info">
                  {lookup.count !== undefined && (
                    <p className="lookup-count">
                      <strong>{lookup.count}</strong> items
                    </p>
                  )}
                  {lookup.created_at && (
                    <p className="lookup-date">
                      Created: {new Date(lookup.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="lookup-actions">
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteLookup(lookup)}
                  >
                    Delete
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
            <h3>Upload CSV Lookup Data</h3>
            
            <div className="form-group">
              <label htmlFor="lookupName">Lookup Name</label>
              <input
                id="lookupName"
                type="text"
                className="form-control"
                value={uploadData.lookupName}
                onChange={(e) => setUploadData({ ...uploadData, lookupName: e.target.value })}
                placeholder="e.g., cuisine-types"
              />
              <small>Use lowercase with hyphens, no spaces</small>
            </div>

            <div className="form-group">
              <label>Lookup Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="key_value"
                    checked={uploadData.lookupType === 'key_value'}
                    onChange={(e) => setUploadData({ ...uploadData, lookupType: 'key_value' })}
                  />
                  <span>Key-Value</span>
                  <small>CSV with 'key' and 'value' columns</small>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="list"
                    checked={uploadData.lookupType === 'list'}
                    onChange={(e) => setUploadData({ ...uploadData, lookupType: 'list' })}
                  />
                  <span>List</span>
                  <small>CSV with single 'value' column</small>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="csvFile">CSV File</label>
              <input
                id="csvFile"
                type="file"
                accept=".csv"
                className="form-control"
                onChange={handleFileChange}
              />
              {uploadData.csvFile && (
                <small>Selected: {uploadData.csvFile.name}</small>
              )}
            </div>

            <div className="sample-csv-section">
              <p>Need a template?</p>
              <div className="sample-buttons">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => downloadSampleCSV('key_value')}
                >
                  📥 Sample Key-Value CSV
                </button>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => downloadSampleCSV('list')}
                >
                  📥 Sample List CSV
                </button>
              </div>
            </div>

            <div className="csv-format-info">
              <h4>CSV Format Requirements:</h4>
              <div className="format-examples">
                <div className="format-example">
                  <strong>Key-Value format:</strong>
                  <pre>{`key,value
italian,Italian Cuisine
mexican,Mexican Cuisine`}</pre>
                </div>
                <div className="format-example">
                  <strong>List format:</strong>
                  <pre>{`value
Option 1
Option 2`}</pre>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadData({ lookupName: '', lookupType: 'key_value', csvFile: null })
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUploadCSV}
                disabled={uploading || !uploadData.lookupName || !uploadData.csvFile}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LookupManagement