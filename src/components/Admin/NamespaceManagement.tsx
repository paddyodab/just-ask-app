import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAdminContext } from '../../contexts/AdminContext'
import './NamespaceManagement.css'

interface Customer {
  id: string
  name: string
  hex_id: string
}

interface Namespace {
  id: string
  name: string
  slug: string
  description?: string
  is_deleted?: boolean
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

const NamespaceManagement: React.FC = () => {
  const {
    selectedCustomerId,
    selectedCustomerName,
    selectedNamespaceId,
    selectedNamespaceName,
    setSelectedCustomer,
    setSelectedNamespace,
    setAvailableNamespaces
  } = useAdminContext()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingNamespace, setEditingNamespace] = useState<Namespace | null>(null)
  const [deletingNamespace, setDeletingNamespace] = useState<Namespace | null>(null)
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft')
  const [showDeleted, setShowDeleted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (selectedCustomerId) {
      fetchNamespaces(selectedCustomerId)
    } else {
      setNamespaces([])
      setAvailableNamespaces([])
    }
  }, [selectedCustomerId])

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
      } else {
        throw new Error('Failed to fetch customers')
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
      setLoading(true)
      setError(null)
      // Include deleted namespaces in the response
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces?include_deleted=true`)
      
      if (response.ok) {
        const data = await response.json()
        const namespacesList = data.namespaces || []
        setNamespaces(namespacesList)
        setAvailableNamespaces(namespacesList)
      } else {
        throw new Error('Failed to fetch namespaces')
      }
    } catch (err) {
      console.error('Error fetching namespaces:', err)
      setError('Failed to load namespaces')
      // Demo data
      setNamespaces([
        {
          id: '1',
          name: 'Restaurant Survey',
          slug: 'restaurant-survey',
          description: 'Customer dining preferences'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNamespace = async () => {
    if (!formData.name || !formData.slug) return

    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/v1/operations/customers/${selectedCustomerId}/namespaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description
        })
      })

      if (response.ok) {
        const newNamespace = await response.json()
        setNamespaces([...namespaces, newNamespace])
        setFormData({ name: '', slug: '', description: '' })
        setShowCreateModal(false)
      } else {
        throw new Error('Failed to create namespace')
      }
    } catch (err) {
      console.error('Error creating namespace:', err)
      setError('Failed to create namespace')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateNamespace = async () => {
    if (!editingNamespace || !formData.name || !formData.slug) return

    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomerId}/namespaces/${editingNamespace.slug}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description
          })
        }
      )

      if (response.ok) {
        const updatedNamespace = await response.json()
        setNamespaces(namespaces.map(ns => 
          ns.slug === editingNamespace.slug ? updatedNamespace : ns
        ))
        setFormData({ name: '', slug: '', description: '' })
        setShowEditModal(false)
        setEditingNamespace(null)
      } else {
        throw new Error('Failed to update namespace')
      }
    } catch (err) {
      console.error('Error updating namespace:', err)
      setError('Failed to update namespace')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNamespace = (namespace: Namespace) => {
    setDeletingNamespace(namespace)
    setShowDeleteModal(true)
    setDeleteType(namespace.is_deleted ? 'hard' : 'soft')
  }

  const confirmDeleteNamespace = async () => {
    if (!deletingNamespace) return

    try {
      setError(null)
      const url = deleteType === 'hard'
        ? `/api/v1/operations/customers/${selectedCustomerId}/namespaces/${deletingNamespace.slug}?hard_delete=true`
        : `/api/v1/operations/customers/${selectedCustomerId}/namespaces/${deletingNamespace.slug}`
      
      const response = await fetch(url, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh the namespace list to get updated state from backend
        await fetchNamespaces(selectedCustomerId)
        
        setShowDeleteModal(false)
        setDeletingNamespace(null)
        setDeleteType('soft')
      } else {
        throw new Error('Failed to delete namespace')
      }
    } catch (err) {
      console.error('Error deleting namespace:', err)
      setError('Failed to delete namespace')
      setShowDeleteModal(false)
      setDeletingNamespace(null)
    }
  }

  const handleRestoreNamespace = async (namespace: Namespace) => {
    try {
      setError(null)
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomerId}/namespaces/${namespace.slug}/restore`,
        {
          method: 'POST'
        }
      )

      if (response.ok) {
        // Refresh the namespace list to get updated state from backend
        await fetchNamespaces(selectedCustomerId)
      } else {
        throw new Error('Failed to restore namespace')
      }
    } catch (err) {
      console.error('Error restoring namespace:', err)
      setError('Failed to restore namespace')
    }
  }

  const openEditModal = (namespace: Namespace) => {
    setEditingNamespace(namespace)
    setFormData({
      name: namespace.name,
      slug: namespace.slug,
      description: namespace.description || ''
    })
    setShowEditModal(true)
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Filter namespaces based on showDeleted toggle
  const visibleNamespaces = showDeleted 
    ? namespaces 
    : namespaces.filter(ns => !ns.is_deleted)
  
  const deletedCount = namespaces.filter(ns => ns.is_deleted).length

  return (
    <div className="namespace-management">
      <div className="management-header">
        <h2>Namespace Management</h2>
        <div className="header-actions">
          <select 
            className="customer-select"
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
            <option value="">Select a customer...</option>
            {customers.map(customer => (
              <option key={customer.hex_id} value={customer.hex_id}>
                {customer.name}
              </option>
            ))}
          </select>
          {deletedCount > 0 && selectedCustomerId && (
            <label className="toggle-deleted">
              <input 
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              Show deleted ({deletedCount})
            </label>
          )}
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedCustomerId}
          >
            + New Namespace
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!selectedCustomerId ? (
        <div className="empty-state">
          <p>Please select a customer to manage namespaces</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="namespaces-grid">
          {visibleNamespaces.length === 0 ? (
            <div className="empty-state">
              <p>{showDeleted ? 'No namespaces found' : 'No active namespaces found'}</p>
              {!showDeleted && deletedCount > 0 && (
                <p className="hint">
                  {deletedCount} deleted namespace(s) hidden. 
                  <button 
                    className="link-button"
                    onClick={() => setShowDeleted(true)}
                  >
                    Show deleted
                  </button>
                </p>
              )}
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create first namespace
              </button>
            </div>
          ) : (
            visibleNamespaces.map(namespace => (
              <div 
                key={namespace.slug} 
                className={`namespace-card ${namespace.is_deleted ? 'deleted' : ''}`}
              >
                {namespace.is_deleted && (
                  <div className="deleted-badge">Deleted</div>
                )}
                <div className="namespace-info">
                  <h3>{namespace.name}</h3>
                  <p className="namespace-slug">Slug: {namespace.slug}</p>
                  {namespace.description && (
                    <p className="namespace-description">{namespace.description}</p>
                  )}
                  {namespace.deleted_at ? (
                    <p className="namespace-date deleted-date">
                      Deleted: {new Date(namespace.deleted_at).toLocaleDateString()}
                    </p>
                  ) : namespace.created_at ? (
                    <p className="namespace-date">
                      Created: {new Date(namespace.created_at).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
                <div className="namespace-actions">
                  {namespace.is_deleted ? (
                    <>
                      <div className="namespace-actions-left">
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleRestoreNamespace(namespace)}
                        >
                          Restore
                        </button>
                      </div>
                      <div className="namespace-actions-right">
                        <button 
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDeleteNamespace(namespace)}
                          title="Permanently delete namespace"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="namespace-actions-left">
                        <button 
                          className="btn-icon"
                          onClick={() => openEditModal(namespace)}
                          title="Edit namespace"
                        >
                          ✏️
                        </button>
                      </div>
                      <div className="namespace-actions-right">
                        <button 
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDeleteNamespace(namespace)}
                          title="Delete namespace"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Create New Namespace</h3>
            <div className="form-group">
              <label htmlFor="namespaceName">Name</label>
              <input
                id="namespaceName"
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  })
                }}
                placeholder="e.g., Customer Feedback"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="namespaceSlug">Slug</label>
              <input
                id="namespaceSlug"
                type="text"
                className="form-control"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., customer-feedback"
              />
              <small>URL-friendly identifier</small>
            </div>
            <div className="form-group">
              <label htmlFor="namespaceDesc">Description (Optional)</label>
              <textarea
                id="namespaceDesc"
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this namespace"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ name: '', slug: '', description: '' })
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateNamespace}
                disabled={saving || !formData.name || !formData.slug}
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Namespace</h3>
            <div className="form-group">
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Feedback"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="editSlug">Slug</label>
              <input
                id="editSlug"
                type="text"
                className="form-control"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., customer-feedback"
              />
            </div>
            <div className="form-group">
              <label htmlFor="editDesc">Description</label>
              <textarea
                id="editDesc"
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingNamespace(null)
                  setFormData({ name: '', slug: '', description: '' })
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUpdateNamespace}
                disabled={saving || !formData.name || !formData.slug}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingNamespace && (
        <div className="modal-overlay" onClick={() => {
          setShowDeleteModal(false)
          setDeletingNamespace(null)
          setDeleteType('soft')
        }}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Delete Namespace</h3>
            
            <div className="delete-warning">
              <p>Are you sure you want to delete <strong>{deletingNamespace.name}</strong>?</p>
              
              <div className="delete-options">
                <label className="delete-option">
                  <input
                    type="radio"
                    value="soft"
                    checked={deleteType === 'soft'}
                    onChange={() => setDeleteType('soft')}
                  />
                  <div>
                    <strong>Soft Delete (Recommended)</strong>
                    <p>Mark as deleted but preserve all surveys and data for recovery</p>
                  </div>
                </label>
                
                <label className="delete-option">
                  <input
                    type="radio"
                    value="hard"
                    checked={deleteType === 'hard'}
                    onChange={() => setDeleteType('hard')}
                  />
                  <div>
                    <strong>Hard Delete</strong>
                    <p className="danger-text">⚠️ Permanently delete namespace and ALL associated surveys, lookups, and data. This cannot be undone!</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingNamespace(null)
                  setDeleteType('soft')
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDeleteNamespace}
              >
                {deleteType === 'hard' ? '⚠️ Permanently Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NamespaceManagement