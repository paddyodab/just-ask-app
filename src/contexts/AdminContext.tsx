import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Namespace {
  id?: string
  namespaceId?: string
  slug: string
  name: string
  tenantId?: string
}

interface AdminContextType {
  selectedCustomerId: string | null
  selectedCustomerName: string | null
  selectedNamespaceId: string | null
  selectedNamespaceName: string | null
  availableNamespaces: Namespace[]
  setSelectedCustomer: (id: string | null, name: string | null) => void
  setSelectedNamespace: (id: string | null, name: string | null) => void
  setAvailableNamespaces: (namespaces: Namespace[]) => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

interface AdminProviderProps {
  children: ReactNode
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  // Initialize from localStorage to persist across page refreshes
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    return localStorage.getItem('adminSelectedCustomerId')
  })
  
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(() => {
    return localStorage.getItem('adminSelectedCustomerName')
  })
  
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string | null>(() => {
    return localStorage.getItem('adminSelectedNamespaceId')
  })
  
  const [selectedNamespaceName, setSelectedNamespaceName] = useState<string | null>(() => {
    return localStorage.getItem('adminSelectedNamespaceName')
  })
  
  const [availableNamespaces, setAvailableNamespaces] = useState<Namespace[]>([])

  // Sync with URL parameters for better UX (browser back/forward)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCustomerId = params.get('customerId')
    const urlNamespaceId = params.get('namespaceId')
    
    if (urlCustomerId && !selectedCustomerId) {
      setSelectedCustomerId(urlCustomerId)
    }
    if (urlNamespaceId && !selectedNamespaceId) {
      setSelectedNamespaceId(urlNamespaceId)
    }
  }, [])

  const setSelectedCustomer = (id: string | null, name: string | null) => {
    setSelectedCustomerId(id)
    setSelectedCustomerName(name)
    
    // Persist to localStorage
    if (id) {
      localStorage.setItem('adminSelectedCustomerId', id)
      localStorage.setItem('adminSelectedCustomerName', name || '')
      
      // Update URL without causing navigation
      const url = new URL(window.location.href)
      url.searchParams.set('customerId', id)
      window.history.replaceState({}, '', url.toString())
    } else {
      localStorage.removeItem('adminSelectedCustomerId')
      localStorage.removeItem('adminSelectedCustomerName')
      
      // Remove from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('customerId')
      window.history.replaceState({}, '', url.toString())
    }
    
    // Clear namespace when customer changes
    if (id !== selectedCustomerId) {
      setSelectedNamespace(null, null)
      setAvailableNamespaces([])
    }
  }

  const setSelectedNamespace = (id: string | null, name: string | null) => {
    setSelectedNamespaceId(id)
    setSelectedNamespaceName(name)
    
    // Persist to localStorage
    if (id) {
      localStorage.setItem('adminSelectedNamespaceId', id)
      localStorage.setItem('adminSelectedNamespaceName', name || '')
      
      // Update URL without causing navigation
      const url = new URL(window.location.href)
      url.searchParams.set('namespaceId', id)
      window.history.replaceState({}, '', url.toString())
    } else {
      localStorage.removeItem('adminSelectedNamespaceId')
      localStorage.removeItem('adminSelectedNamespaceName')
      
      // Remove from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('namespaceId')
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <AdminContext.Provider 
      value={{
        selectedCustomerId,
        selectedCustomerName,
        selectedNamespaceId,
        selectedNamespaceName,
        availableNamespaces,
        setSelectedCustomer,
        setSelectedNamespace,
        setAvailableNamespaces
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export const useAdminContext = () => {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider')
  }
  return context
}