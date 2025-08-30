// Auth utility functions
// In a real application, these would handle JWT tokens and proper authentication

export function getAuthToken(): string {
  // In production, get from localStorage or session
  return localStorage.getItem('auth_token') || 'test-token'
}

export function getTenantId(): string {
  // Get from environment or user context
  return import.meta.env.VITE_TENANT_ID || 'test-tenant-id'
}

export function getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${getAuthToken()}`,
    'X-Tenant-ID': getTenantId(),
    'Content-Type': 'application/json'
  }
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

export function clearAuth(): void {
  localStorage.removeItem('auth_token')
}