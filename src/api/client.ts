import axios, { AxiosInstance } from 'axios'
import { getAuthHeaders } from '../utils/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth headers
apiClient.interceptors.request.use(
  (config) => {
    const authHeaders = getAuthHeaders()
    config.headers = {
      ...config.headers,
      ...authHeaders,
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      console.error('Unauthorized access')
    } else if (error.response?.status === 403) {
      console.error('Forbidden access')
    } else if (error.response?.status === 404) {
      console.error('Resource not found')
    } else if (error.response?.status >= 500) {
      console.error('Server error')
    }
    return Promise.reject(error)
  }
)

export default apiClient