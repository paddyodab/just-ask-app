import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import './CustomerManagement.css'

interface Customer {
  id: string
  name: string
  hex_id: string
  created_at?: string
  updated_at?: string
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/operations/customers')
      
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
    if (!newCustomerName.trim()) return

    try {
      setCreating(true)
      setError(null)
      
      const response = await fetch('/api/v1/operations/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCustomerName.trim()
        })
      })

      if (response.ok) {
        const newCustomer = await response.json()
        setCustomers([...customers, newCustomer])
        setNewCustomerName('')
        setShowCreateModal(false)
      } else {
        throw new Error('Failed to create customer')
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      setError('Failed to create customer. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/v1/operations/customers/${customer.hex_id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCustomers(customers.filter(c => c.hex_id !== customer.hex_id))
      } else {
        throw new Error('Failed to delete customer')
      }
    } catch (err) {
      console.error('Error deleting customer:', err)
      setError('Failed to delete customer. Please try again.')
    }
  }

  const handleViewCustomer = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/v1/operations/customers/${customer.hex_id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedCustomer(data)
      }
    } catch (err) {
      console.error('Error fetching customer details:', err)
      setSelectedCustomer(customer)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="customer-management">
      <div className="management-header">
        <h2>Customer Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + New Customer
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="customers-grid">
        {customers.length === 0 ? (
          <div className="empty-state">
            <p>No customers found</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create your first customer
            </button>
          </div>
        ) : (
          customers.map(customer => (
            <div key={customer.hex_id} className="customer-card">
              <div className="customer-info">
                <h3>{customer.name}</h3>
                <p className="customer-hex">ID: {customer.hex_id}</p>
                {customer.created_at && (
                  <p className="customer-date">
                    Created: {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="customer-actions">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleViewCustomer(customer)}
                >
                  View
                </button>
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteCustomer(customer)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Create New Customer</h3>
            <div className="form-group">
              <label htmlFor="customerName">Customer Name</label>
              <input
                id="customerName"
                type="text"
                className="form-control"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Enter customer name"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateCustomer}
                disabled={creating || !newCustomerName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
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
              <div className="detail-row">
                <strong>Hex ID:</strong> <code>{selectedCustomer.hex_id}</code>
              </div>
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