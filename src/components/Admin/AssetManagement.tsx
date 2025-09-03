import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmationModal from '../common/ConfirmationModal'
import './AssetManagement.css'

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

interface Asset {
  name: string
  type: string
  size: number
  url: string
  uploaded_at: string
  content_type?: string
}

const AssetManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    asset: null as Asset | null
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      fetchNamespaces(selectedCustomer)
      setAssets([])
    } else {
      setNamespaces([])
      setAssets([])
    }
  }, [selectedCustomer])

  useEffect(() => {
    if (selectedCustomer && selectedNamespace) {
      fetchAssets(selectedCustomer, selectedNamespace)
    } else {
      setAssets([])
    }
  }, [selectedCustomer, selectedNamespace])

  // ESC key handler for closing Asset Preview modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPreviewModal) {
        setShowPreviewModal(false)
        setPreviewAsset(null)
        setPreviewContent('')
      }
    }

    if (showPreviewModal) {
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [showPreviewModal])

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

  const fetchAssets = async (customerHex: string, namespaceSlug: string) => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(
        `${apiUrl}/${customerHex}/${namespaceSlug}/assets`
      )
      
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
        setError(null)
      } else if (response.status === 404) {
        // No assets found is not an error
        setAssets([])
        setError(null)
      } else {
        console.error('Failed to fetch assets:', response.status, response.statusText)
        setError(`Failed to load assets (${response.status})`)
        setAssets([])
      }
    } catch (err) {
      console.error('Error fetching assets:', err)
      setError('Failed to load assets - network error')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  const handleUploadFiles = async () => {
    if (!uploadFiles || uploadFiles.length === 0) return

    try {
      setUploading(true)
      setError(null)
      
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        
        const response = await fetch(
          `/api/v1/operations/customers/${selectedCustomer}/namespaces/${selectedNamespace}/assets/upload`,
          {
            method: 'POST',
            body: formData
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }

      // Refresh assets list
      await fetchAssets(selectedCustomer, selectedNamespace)
      setUploadFiles(null)
      setShowUploadModal(false)
    } catch (err) {
      console.error('Error uploading files:', err)
      setError('Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAsset = async (asset: Asset) => {
    setConfirmModal({ isOpen: true, asset })
  }

  const confirmDelete = async () => {
    const asset = confirmModal.asset
    if (!asset) return

    try {
      setError(null)
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomer}/namespaces/${selectedNamespace}/assets/${asset.name}`,
        {
          method: 'DELETE'
        }
      )

      if (response.ok) {
        setAssets(assets.filter(a => a.name !== asset.name))
      } else {
        throw new Error('Failed to delete asset')
      }
    } catch (err) {
      console.error('Error deleting asset:', err)
      setError('Failed to delete asset')
    } finally {
      setConfirmModal({ isOpen: false, asset: null })
    }
  }

  const handlePreviewAsset = async (asset: Asset) => {
    setPreviewAsset(asset)
    setPreviewContent('')
    
    // For CSS files, fetch the content
    if (asset.content_type?.includes('css') || asset.name.endsWith('.css')) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const fullUrl = asset.url.startsWith('http') ? asset.url : `${apiUrl}${asset.url}`
        const response = await fetch(fullUrl)
        if (response.ok) {
          const content = await response.text()
          setPreviewContent(content)
        }
      } catch (err) {
        console.error('Error fetching CSS content:', err)
      }
    }
    
    setShowPreviewModal(true)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (contentType: string): string => {
    if (contentType.includes('css')) return '🎨'
    if (contentType.includes('javascript')) return '📜'
    if (contentType.includes('image')) return '🖼️'
    if (contentType.includes('font')) return '🔤'
    if (contentType.includes('json')) return '📋'
    return '📄'
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFiles(e.target.files)
    }
  }

  const copyAssetUrl = (url: string) => {
    // The url already contains the full path like /30f8f53cf8034393b00665f664a60ddb/restaurant-survey/assets/brand.css
    // So we just copy it as-is
    navigator.clipboard.writeText(url).then(() => {
      // Could add a toast notification here
      console.log('URL copied to clipboard:', url)
    }).catch(err => {
      console.error('Failed to copy URL:', err)
    })
  }

  return (
    <div className="asset-management">
      <div className="management-header">
        <h2>Asset Management</h2>
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
            📤 Upload Assets
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
          <p>Please select a customer and namespace to manage assets</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="assets-grid">
          {assets.length === 0 ? (
            <div className="empty-state">
              <p>No assets uploaded yet</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                Upload first asset
              </button>
            </div>
          ) : (
            assets.map(asset => (
              <div 
                key={asset.name} 
                className="asset-card"
                onClick={() => handlePreviewAsset(asset)}
                style={{ cursor: 'pointer' }}
              >
                <div className="asset-icon">
                  {getFileIcon(asset.content_type || asset.type)}
                </div>
                <div className="asset-info">
                  <h3>{asset.name}</h3>
                  <div className="asset-meta">
                    <span className="asset-type">{asset.content_type || asset.type}</span>
                    <span className="asset-size">{formatFileSize(asset.size)}</span>
                  </div>
                  {asset.uploaded_at && (
                    <p className="asset-date">
                      Uploaded: {new Date(asset.uploaded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="asset-actions">
                  <div className="asset-actions-left">
                    <button 
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreviewAsset(asset)
                      }}
                      title="Preview asset"
                    >
                      👓
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyAssetUrl(asset.url)
                      }}
                      title="Copy URL"
                    >
                      📋
                    </button>
                    <a 
                      href={asset.url} 
                      download={asset.name}
                      className="btn-icon"
                      title="Download asset"
                    >
                      📥
                    </a>
                  </div>
                  <div className="asset-actions-right">
                    <button 
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAsset(asset)
                      }}
                      title="Delete asset"
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
            <h3>Upload Assets</h3>
            
            <div className="upload-info">
              <p>Upload CSS files, images, fonts, and other assets for your surveys.</p>
              <p className="supported-types">
                Supported: .css, .png, .jpg, .svg, .woff, .woff2, .ttf, .json
              </p>
            </div>

            <div 
              className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="dropzone-content">
                <span className="dropzone-icon">📁</span>
                <p>Drag and drop files here or</p>
                <label htmlFor="fileInput" className="btn btn-secondary">
                  Browse Files
                </label>
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  accept=".css,.png,.jpg,.jpeg,.svg,.gif,.woff,.woff2,.ttf,.otf,.json,.js"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {uploadFiles && uploadFiles.length > 0 && (
              <div className="selected-files">
                <h4>Selected Files:</h4>
                <ul>
                  {Array.from(uploadFiles).map((file, index) => (
                    <li key={index}>
                      {file.name} ({formatFileSize(file.size)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="asset-url-info">
              <h4>📝 How to use assets in surveys:</h4>
              <div className="url-example">
                <code>/{'{tenant_id}'}/{'{namespace}'}/assets/filename.ext</code>
              </div>
              <p>Use these URLs in your survey JSON for logos and stylesheets.</p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFiles(null)
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUploadFiles}
                disabled={uploading || !uploadFiles || uploadFiles.length === 0}
              >
                {uploading ? 'Uploading...' : `Upload ${uploadFiles?.length || 0} File${uploadFiles?.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewAsset && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>Asset Preview: {previewAsset.name}</h3>
            
            <div className="asset-preview-content">
              {previewAsset.content_type?.includes('image') ? (
                <div className="image-preview">
                  <img 
                    src={previewAsset.url.startsWith('http') 
                      ? previewAsset.url 
                      : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${previewAsset.url}`} 
                    alt={previewAsset.name} 
                  />
                </div>
              ) : previewAsset.content_type?.includes('css') || previewAsset.name.endsWith('.css') ? (
                <div className="code-preview">
                  {previewContent ? (
                    <pre className="css-preview-content">
                      <code>{previewContent}</code>
                    </pre>
                  ) : (
                    <div className="preview-loading">Loading CSS content...</div>
                  )}
                </div>
              ) : (
                <div className="file-info-preview">
                  <div className="file-icon-large">
                    {getFileIcon(previewAsset.content_type || previewAsset.type)}
                  </div>
                  <h4>{previewAsset.name}</h4>
                  <p>Type: {previewAsset.content_type || previewAsset.type}</p>
                  <p>Size: {formatFileSize(previewAsset.size)}</p>
                  <p>URL: <code>{previewAsset.url}</code></p>
                </div>
              )}
            </div>

            <div className="preview-info">
              <h4>Usage in Survey JSON:</h4>
              <pre className="code-example">
{previewAsset.name.endsWith('.css') ? 
`"assets": {
  "stylesheets": [
    "/{'{tenant_id}'}/{'{namespace}'}/assets/${previewAsset.name}"
  ]
}` :
previewAsset.content_type?.includes('image') ?
`"logo": "/{'{tenant_id}'}/{'{namespace}'}/assets/${previewAsset.name}",
"logoPosition": "top",
"logoWidth": "200px"` :
`"/{'{tenant_id}'}/{'{namespace}'}/assets/${previewAsset.name}"`}
              </pre>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                Note: The {'{tenant_id}'} and {'{namespace}'} placeholders will be automatically replaced at runtime.
              </p>
            </div>

            <div className="modal-actions">
              <a 
                href={previewAsset.url} 
                download={previewAsset.name}
                className="btn btn-secondary"
              >
                📥 Download
              </a>
              <button 
                className="btn btn-primary"
                onClick={() => setShowPreviewModal(false)}
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
        title="Delete Asset"
        message={`Are you sure you want to delete the asset "${confirmModal.asset?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="btn-danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, asset: null })}
        icon="⚠️"
      />
    </div>
  )
}

export default AssetManagement