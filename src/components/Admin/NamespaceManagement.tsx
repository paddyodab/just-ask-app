import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
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
  created_at?: string
  updated_at?: string
}

const NamespaceManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingNamespace, setEditingNamespace] = useState<Namespace | null>(null)
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
    if (selectedCustomer) {
      fetchNamespaces(selectedCustomer)
    } else {
      setNamespaces([])
    }
  }, [selectedCustomer])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/v1/operations/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
        if (data.customers?.length > 0) {
          setSelectedCustomer(data.customers[0].hex_id)
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
      setSelectedCustomer(demoCustomers[0].hex_id)
    }
  }

  const fetchNamespaces = async (customerHex: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/v1/operations/customers/${customerHex}/namespaces`)
      
      if (response.ok) {
        const data = await response.json()
        setNamespaces(data.namespaces || [])
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
      
      const response = await fetch(`/api/v1/operations/customers/${selectedCustomer}/namespaces`, {
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
        `/api/v1/operations/customers/${selectedCustomer}/namespaces/${editingNamespace.slug}`,
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

  const handleDeleteNamespace = async (namespace: Namespace) => {
    if (!confirm(`Delete namespace "${namespace.name}"? This will also delete all associated data.`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(
        `/api/v1/operations/customers/${selectedCustomer}/namespaces/${namespace.slug}`,
        {
          method: 'DELETE'
        }
      )

      if (response.ok) {
        setNamespaces(namespaces.filter(ns => ns.slug !== namespace.slug))
      } else {
        throw new Error('Failed to delete namespace')
      }
    } catch (err) {
      console.error('Error deleting namespace:', err)
      setError('Failed to delete namespace')
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

  return (
    <div className="namespace-management">
      <div className="management-header">
        <h2>Namespace Management</h2>
        <div className="header-actions">
          <select 
            className="customer-select"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">Select a customer...</option>
            {customers.map(customer => (
              <option key={customer.hex_id} value={customer.hex_id}>
                {customer.name}
              </option>
            ))}
          </select>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedCustomer}
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

      {!selectedCustomer ? (
        <div className="empty-state">
          <p>Please select a customer to manage namespaces</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="namespaces-grid">
          {namespaces.length === 0 ? (
            <div className="empty-state">
              <p>No namespaces found for this customer</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create first namespace
              </button>
            </div>
          ) : (
            namespaces.map(namespace => (
              <div key={namespace.slug} className="namespace-card">
                <div className="namespace-info">
                  <h3>{namespace.name}</h3>
                  <p className="namespace-slug">Slug: {namespace.slug}</p>
                  {namespace.description && (
                    <p className="namespace-description">{namespace.description}</p>
                  )}
                </div>
                <div className="namespace-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEditModal(namespace)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteNamespace(namespace)}
                  >
                    Delete
                  </button>
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
    </div>
  )
}

export default NamespaceManagement