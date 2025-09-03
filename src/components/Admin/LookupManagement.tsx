import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmationModal from '../common/ConfirmationModal'
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
  const [showDataModal, setShowDataModal] = useState(false)
  const [viewingLookup, setViewingLookup] = useState<Lookup | null>(null)
  const [lookupData, setLookupData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [uploadData, setUploadData] = useState({
    lookupName: '',
    lookupType: 'key_value' as 'list' | 'key_value',
    csvFile: null as File | null
  })
  const [uploading, setUploading] = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [urlLookup, setUrlLookup] = useState<Lookup | null>(null)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    lookup: null as Lookup | null
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchNamespaces(selectedCustomer)
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

  // ESC key handler for closing Lookup Data modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDataModal) {
        setShowDataModal(false)
        setViewingLookup(null)
        setLookupData([])
      }
    }

    if (showDataModal) {
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [showDataModal])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/v1/operations/customers')
      if (response.ok) {
        const data = await response.json()
        const customersList = data.customers || []
        setCustomers(customersList)
        // Auto-select the first customer if available
        if (customersList.length > 0 && !selectedCustomer) {
          setSelectedCustomer(customersList[0].hex_id)
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
      if (!selectedCustomer) {
        setSelectedCustomer(demoCustomers[0].hex_id)
      }
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces`)
      if (response.ok) {
        const data = await response.json()
        const namespacesList = data.namespaces || []
        setNamespaces(namespacesList)
        // Auto-select the first namespace if available
        if (namespacesList.length > 0) {
          setSelectedNamespace(namespacesList[0].slug)
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
      setNamespaces(demoNamespaces)
      // Auto-select the first namespace
      setSelectedNamespace(demoNamespaces[0].slug)
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

  const handleViewLookupData = async (lookup: Lookup) => {
    setViewingLookup(lookup)
    setShowDataModal(true)
    setLoadingData(true)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/${selectedCustomer}/${selectedNamespace}/lookups/${lookup.name}?page=1&size=1000&reverse=false`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object responses
        if (Array.isArray(data)) {
          setLookupData(data)
        } else if (data.items) {
          setLookupData(data.items)
        } else {
          setLookupData([])
        }
      } else {
        throw new Error('Failed to fetch lookup data')
      }
    } catch (err) {
      console.error('Error fetching lookup data:', err)
      // Demo data with all fields
      setLookupData([
        { 
          key: 'beach', 
          value: 'Beach Resorts', 
          text: 'Beach Resorts',
          description: 'Relaxing beach destinations',
          category: 'leisure',
          popularity: 95,
          created_at: '2025-01-15T10:00:00Z'
        },
        { 
          key: 'mountain', 
          value: 'Mountain Retreats', 
          text: 'Mountain Retreats',
          description: 'Mountain hiking and skiing',
          category: 'adventure',
          popularity: 78,
          created_at: '2025-01-15T10:00:00Z'
        },
        { 
          key: 'city', 
          value: 'City Tours', 
          text: 'City Tours',
          description: 'Urban exploration and culture',
          category: 'culture',
          popularity: 82,
          created_at: '2025-01-15T10:00:00Z'
        }
      ])
    } finally {
      setLoadingData(false)
    }
  }

  const exportLookupData = () => {
    if (!viewingLookup || lookupData.length === 0) return
    
    // Get all unique keys from all items
    const allKeys = new Set<string>()
    lookupData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key))
    })
    
    const headers = Array.from(allKeys)
    
    // Build CSV content with all fields
    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n'
    csvContent += lookupData.map(item => 
      headers.map(header => {
        const value = item[header]
        if (value === null || value === undefined) return ''
        const strValue = String(value)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`
        }
        return strValue
      }).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${viewingLookup.name}_data.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteLookup = async (lookup: Lookup) => {
    setConfirmModal({ isOpen: true, lookup })
  }

  const confirmDelete = async () => {
    const lookup = confirmModal.lookup
    if (!lookup) return

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
    } finally {
      setConfirmModal({ isOpen: false, lookup: null })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadData({ ...uploadData, csvFile: e.target.files[0] })
    }
  }

  const handleShowUrl = (lookup: Lookup) => {
    setUrlLookup(lookup)
    setShowUrlModal(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here if you want
    }).catch(err => {
      console.error('Failed to copy: ', err)
    })
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
              <div 
                key={lookup.name} 
                className="lookup-card"
                onClick={() => handleViewLookupData(lookup)}
                style={{ cursor: 'pointer' }}
              >
                <div className="lookup-header">
                  <h3>{lookup.name}</h3>
                  <div className="lookup-header-right">
                    <span className={`lookup-type ${lookup.type}`}>
                      {lookup.type === 'key_value' ? 'Key-Value' : 'List'}
                    </span>
                  </div>
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
                  <div className="lookup-actions-left">
                    <button 
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewLookupData(lookup)
                      }}
                      title="View lookup data"
                    >
                      👓
                    </button>
                    <button 
                      className="btn-icon btn-icon-info"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShowUrl(lookup)
                      }}
                      title="Show API URL for surveys"
                    >
                      ℹ️
                    </button>
                  </div>
                  <div className="lookup-actions-right">
                    <button 
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteLookup(lookup)
                      }}
                      title="Delete lookup"
                    >
                      🗑️
                    </button>
                  </div>
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

      {/* View Data Modal */}
      {showDataModal && viewingLookup && (
        <div className="modal-overlay" onClick={() => setShowDataModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>Lookup Data: {viewingLookup.name}</h3>
            
            <div className="data-modal-header">
              <p className="data-info">
                Type: <strong>{viewingLookup.type === 'key_value' ? 'Key-Value' : 'List'}</strong>
                {' • '}
                Total items: <strong>{lookupData.length}</strong>
              </p>
              <button 
                className="btn btn-sm btn-primary"
                onClick={exportLookupData}
                disabled={loadingData || lookupData.length === 0}
              >
                📥 Export CSV
              </button>
            </div>

            {loadingData ? (
              <LoadingSpinner />
            ) : lookupData.length === 0 ? (
              <div className="empty-state">
                <p>No data found for this lookup</p>
              </div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      {(() => {
                        // Get all unique keys from all items to create headers
                        const allKeys = new Set<string>()
                        lookupData.forEach(item => {
                          Object.keys(item).forEach(key => allKeys.add(key))
                        })
                        return Array.from(allKeys).map(key => (
                          <th key={key} className={key === 'key' ? 'key-header' : ''}>
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                          </th>
                        ))
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {lookupData.map((item, index) => (
                      <tr key={index}>
                        {(() => {
                          // Get headers again to ensure consistent column order
                          const allKeys = new Set<string>()
                          lookupData.forEach(item => {
                            Object.keys(item).forEach(key => allKeys.add(key))
                          })
                          return Array.from(allKeys).map(key => (
                            <td key={key} className={key === 'key' ? 'key-cell' : ''}>
                              {item[key] !== null && item[key] !== undefined ? String(item[key]) : ''}
                            </td>
                          ))
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowDataModal(false)
                  setViewingLookup(null)
                  setLookupData([])
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API URL Modal */}
      {showUrlModal && urlLookup && (
        <div className="modal-overlay" onClick={() => {
          setShowUrlModal(false)
          setUrlLookup(null)
        }}>
          <div className="modal-content url-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ textAlign: 'left' }}>📡 API URL for "{urlLookup.name}"</h3>
            
            <div className="url-info">
              <p>Use this URL in your survey JSON for dynamic dropdowns:</p>
              
              <div className="url-box">
                <code className="api-url">
                  /{selectedCustomer}/{selectedNamespace}/lookups/{urlLookup.name}
                </code>
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(`/${selectedCustomer}/${selectedNamespace}/lookups/${urlLookup.name}`)}
                  title="Copy URL"
                >
                  📋
                </button>
              </div>

              <div className="usage-example">
                <h4>Survey JSON Example:</h4>
                <pre className="code-example">{`{
  "type": "dropdown",
  "name": "selection",
  "title": "Choose an option:",
  "choicesOrder": "asc",
  "choices": {
    "url": "/${selectedCustomer}/${selectedNamespace}/lookups/${urlLookup.name}",
    "valueName": "${urlLookup.type === 'key_value' ? 'key' : 'value'}",
    "titleName": "value"
  }
}`}</pre>
              </div>

              <div className="url-notes">
                <h4>Notes:</h4>
                <ul>
                  <li><strong>Type:</strong> {urlLookup.type === 'key_value' ? 'Key-Value pairs' : 'Simple list'}</li>
                  <li><strong>Items:</strong> {urlLookup.count || 0} options</li>
                  {urlLookup.type === 'key_value' ? (
                    <li><strong>Usage:</strong> Use "key" for values, "value" for display text</li>
                  ) : (
                    <li><strong>Usage:</strong> Both value and display text come from "value" field</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowUrlModal(false)
                  setUrlLookup(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Delete Lookup Data"
        message={`Are you sure you want to delete the lookup "${confirmModal.lookup?.name}"? This will affect any surveys using this data.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="btn-danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, lookup: null })}
        icon="⚠️"
      />
    </div>
  )
}

export default LookupManagement