import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import './CustomerManagement.css'

interface Customer {
  id: string
  customer_id?: string
  name: string
  hex_id: string
  email?: string
  is_active?: boolean
  is_deleted?: boolean
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft')
  const [showDeleted, setShowDeleted] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    email: ''
  })
  const [editFormData, setEditFormData] = useState({
    customer_id: '',
    name: '',
    email: '',
    is_active: true
  })
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      // Include deleted customers in the response
      const response = await fetch('/api/v1/operations/customers?include_deleted=true')
      
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        throw new Error('Failed to fetch customers')
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError('Failed to load customers. Please check your connection.')
      // Demo data for development
      setCustomers([
        {
          id: '1',
          name: 'Demo Restaurant Chain',
          hex_id: '30f8f53cf8034393b00665f664a60ddb',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (!formData.customer_id.trim() || !formData.name.trim() || !formData.email.trim()) {
      setError('All fields are required')
      return
    }

    try {
      setCreating(true)
      setError(null)
      
      const requestBody = {
        customer_id: formData.customer_id.trim(),
        name: formData.name.trim(),
        email: formData.email.trim()
      }
      
      console.log('Sending customer data:', requestBody)
      
      const response = await fetch('/api/v1/operations/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const newCustomer = await response.json()
        setCustomers([...customers, newCustomer])
        setFormData({ customer_id: '', name: '', email: '' })
        setShowCreateModal(false)
      } else {
        // Try to get error details from response
        const errorText = await response.text()
        console.error('Server response:', errorText)
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.detail) {
            if (typeof errorJson.detail === 'string') {
              setError(errorJson.detail)
            } else if (Array.isArray(errorJson.detail)) {
              // Handle validation errors
              const messages = errorJson.detail.map((err: any) => 
                `${err.loc ? err.loc.join(' > ') : 'Field'}: ${err.msg}`
              ).join(', ')
              setError(`Validation failed: ${messages}`)
            }
          } else {
            setError('Failed to create customer')
          }
        } catch {
          setError('Failed to create customer')
        }
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      setError('Failed to create customer. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const confirmDeleteCustomer = async () => {
    if (!deletingCustomer) return

    try {
      setError(null)
      const url = deleteType === 'hard' 
        ? `/api/v1/operations/customers/${deletingCustomer.hex_id}?hard_delete=true`
        : `/api/v1/operations/customers/${deletingCustomer.hex_id}`
        
      const response = await fetch(url, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        // Show how many namespaces were affected if available
        if (result.namespaces_affected !== undefined) {
          console.log(`Deleted customer and ${result.namespaces_affected} namespace(s)`)
        }
        
        // Refresh the customer list to get updated state from backend
        await fetchCustomers()
        
        setDeletingCustomer(null)
        setDeleteType('soft')
      } else {
        throw new Error('Failed to delete customer')
      }
    } catch (err) {
      console.error('Error deleting customer:', err)
      setError('Failed to delete customer. Please try again.')
      setDeletingCustomer(null)
    }
  }

  const handleRestoreCustomer = async (customer: Customer) => {
    try {
      setError(null)
      const response = await fetch(`/api/v1/operations/customers/${customer.hex_id}/restore`, {
        method: 'POST'
      })

      if (response.ok) {
        // Refresh the customer list to get updated state from backend
        await fetchCustomers()
      } else {
        throw new Error('Failed to restore customer')
      }
    } catch (err) {
      console.error('Error restoring customer:', err)
      setError('Failed to restore customer. Please try again.')
    }
  }

  const handleViewCustomer = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/v1/operations/customers/${customer.hex_id}`)
      if (response.ok) {
        const data = await response.json()
        // Ensure the data has the expected structure
        setSelectedCustomer({
          ...customer,
          ...data,
          hex_id: data.hex_id || customer.hex_id,
          name: data.name || customer.name
        })
      } else {
        // If API call fails, use the customer data we already have
        setSelectedCustomer(customer)
      }
    } catch (err) {
      console.error('Error fetching customer details:', err)
      // Use the customer data we already have
      setSelectedCustomer(customer)
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setEditFormData({
      customer_id: customer.customer_id || '',
      name: customer.name,
      email: customer.email || '',
      is_active: customer.is_active !== false
    })
  }

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return
    
    if (!editFormData.name.trim() || !editFormData.email.trim()) {
      setError('Name and email are required')
      return
    }

    try {
      setUpdating(true)
      setError(null)
      
      const requestBody = {
        customer_id: editFormData.customer_id.trim() || editingCustomer.customer_id || editingCustomer.hex_id,
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        is_active: editFormData.is_active
      }
      
      console.log('Updating customer:', requestBody)
      
      const response = await fetch(`/api/v1/operations/customers/${editingCustomer.hex_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const updatedCustomer = await response.json()
        // Update the customer in the list
        setCustomers(customers.map(c => 
          c.hex_id === editingCustomer.hex_id ? { ...c, ...updatedCustomer } : c
        ))
        setEditingCustomer(null)
        setEditFormData({ customer_id: '', name: '', email: '', is_active: true })
      } else {
        // Try to get error details from response
        const errorText = await response.text()
        console.error('Server response:', errorText)
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.detail) {
            if (typeof errorJson.detail === 'string') {
              setError(errorJson.detail)
            } else if (Array.isArray(errorJson.detail)) {
              // Handle validation errors
              const messages = errorJson.detail.map((err: any) => 
                `${err.loc ? err.loc.join(' > ') : 'Field'}: ${err.msg}`
              ).join(', ')
              setError(`Validation failed: ${messages}`)
            }
          } else {
            setError('Failed to update customer')
          }
        } catch {
          setError('Failed to update customer')
        }
      }
    } catch (err) {
      console.error('Error updating customer:', err)
      setError('Failed to update customer. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  // Filter customers based on showDeleted toggle
  const visibleCustomers = showDeleted 
    ? customers 
    : customers.filter(c => !c.is_deleted)
  
  const deletedCount = customers.filter(c => c.is_deleted).length

  return (
    <div className="customer-management">
      <div className="management-header">
        <h2>Customer Management</h2>
        <div className="header-actions">
          {deletedCount > 0 && (
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
          >
            + New Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="customers-grid">
        {visibleCustomers.length === 0 ? (
          <div className="empty-state">
            <p>{showDeleted ? 'No customers found' : 'No active customers found'}</p>
            {!showDeleted && deletedCount > 0 && (
              <p className="hint">
                {deletedCount} deleted customer(s) hidden. 
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
              Create your first customer
            </button>
          </div>
        ) : (
          visibleCustomers.map(customer => (
            <div 
              key={customer.hex_id} 
              className={`customer-card ${customer.is_deleted ? 'deleted' : ''}`}
              onClick={() => handleViewCustomer(customer)}
              style={{ cursor: 'pointer' }}
            >
              {customer.is_deleted && (
                <div className="deleted-badge">Deleted</div>
              )}
              <div className="customer-info">
                <h3>{customer.name}</h3>
                <p className="customer-hex">ID: {customer.hex_id}</p>
                {customer.deleted_at ? (
                  <p className="customer-date deleted-date">
                    Deleted: {new Date(customer.deleted_at).toLocaleDateString()}
                  </p>
                ) : customer.created_at ? (
                  <p className="customer-date">
                    Created: {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
              <div className="customer-actions">
                {customer.is_deleted ? (
                  <>
                    <div className="customer-actions-left">
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestoreCustomer(customer)
                        }}
                      >
                        Restore
                      </button>
                    </div>
                    <div className="customer-actions-right">
                      <button 
                        className="btn-icon btn-icon-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingCustomer(customer)
                          setDeleteType('hard')
                        }}
                        title="Permanently delete customer"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="customer-actions-left">
                      <button 
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCustomer(customer)
                        }}
                        title="View details"
                      >
                        👓
                      </button>
                      <button 
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditCustomer(customer)
                        }}
                        title="Edit customer"
                      >
                        ✏️
                      </button>
                    </div>
                    <div className="customer-actions-right">
                      <button 
                        className="btn-icon btn-icon-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingCustomer(customer)
                        }}
                        title="Delete customer"
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

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false)
          setFormData({ customer_id: '', name: '', email: '' })
          setError(null)
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Create New Customer</h3>
            
            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="customerId">Customer ID *</label>
              <input
                id="customerId"
                type="text"
                className="form-control"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                placeholder="e.g., restaurant-chain-001"
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="customerName">Customer Name *</label>
              <input
                id="customerName"
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Demo Restaurant Chain"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="customerEmail">Email *</label>
              <input
                id="customerEmail"
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., admin@restaurant.com"
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ customer_id: '', name: '', email: '' })
                  setError(null)
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateCustomer}
                disabled={creating || !formData.customer_id.trim() || !formData.name.trim() || !formData.email.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="modal-overlay" onClick={() => {
          setDeletingCustomer(null)
          setDeleteType('soft')
        }}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Delete Customer</h3>
            
            <div className="delete-warning">
              <p>Are you sure you want to delete <strong>{deletingCustomer.name}</strong>?</p>
              
              <div className="delete-options">
                <label className="delete-option">
                  <input
                    type="radio"
                    value="soft"
                    checked={deleteType === 'soft'}
                    onChange={(e) => setDeleteType('soft')}
                  />
                  <div>
                    <strong>Soft Delete (Recommended)</strong>
                    <p>Mark as deleted but preserve data for recovery</p>
                  </div>
                </label>
                
                <label className="delete-option">
                  <input
                    type="radio"
                    value="hard"
                    checked={deleteType === 'hard'}
                    onChange={(e) => setDeleteType('hard')}
                  />
                  <div>
                    <strong>Hard Delete</strong>
                    <p className="danger-text">⚠️ Permanently delete customer and ALL associated namespaces, surveys, and data. This cannot be undone!</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setDeletingCustomer(null)
                  setDeleteType('soft')
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDeleteCustomer}
              >
                {deleteType === 'hard' ? '⚠️ Permanently Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="modal-overlay" onClick={() => {
          setEditingCustomer(null)
          setEditFormData({ customer_id: '', name: '', email: '', is_active: true })
          setError(null)
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Customer</h3>
            
            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="editCustomerId">Customer ID</label>
              <input
                id="editCustomerId"
                type="text"
                className="form-control"
                value={editFormData.customer_id}
                onChange={(e) => setEditFormData({ ...editFormData, customer_id: e.target.value })}
                placeholder="e.g., CUST-002"
              />
              <small>Optional - defaults to hex ID if not provided</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="editCustomerName">Customer Name *</label>
              <input
                id="editCustomerName"
                type="text"
                className="form-control"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="e.g., Acme Corp International"
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editCustomerEmail">Email *</label>
              <input
                id="editCustomerEmail"
                type="email"
                className="form-control"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="e.g., support@acme.com"
              />
            </div>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                />
                <span>Active</span>
              </label>
              <small>Inactive customers cannot be used for new surveys</small>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setEditingCustomer(null)
                  setEditFormData({ customer_id: '', name: '', email: '', is_active: true })
                  setError(null)
                }}
                disabled={updating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUpdateCustomer}
                disabled={updating || !editFormData.name.trim() || !editFormData.email.trim()}
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Customer Details</h3>
            <div className="customer-details">
              <div className="detail-row">
                <strong>Name:</strong> {selectedCustomer.name}
              </div>
              {selectedCustomer.customer_id && (
                <div className="detail-row">
                  <strong>Customer ID:</strong> {selectedCustomer.customer_id}
                </div>
              )}
              <div className="detail-row">
                <strong>Hex ID:</strong> <code>{selectedCustomer.hex_id}</code>
              </div>
              {selectedCustomer.email && (
                <div className="detail-row">
                  <strong>Email:</strong> {selectedCustomer.email}
                </div>
              )}
              {selectedCustomer.is_active !== undefined && (
                <div className="detail-row">
                  <strong>Status:</strong> {selectedCustomer.is_active ? 'Active' : 'Inactive'}
                </div>
              )}
              {selectedCustomer.created_at && (
                <div className="detail-row">
                  <strong>Created:</strong> {new Date(selectedCustomer.created_at).toLocaleString()}
                </div>
              )}
              {selectedCustomer.updated_at && (
                <div className="detail-row">
                  <strong>Updated:</strong> {new Date(selectedCustomer.updated_at).toLocaleString()}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setSelectedCustomer(null)}
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

export default CustomerManagement