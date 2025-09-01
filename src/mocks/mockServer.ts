// Mock server for development
// This simulates the backend API responses when no backend is available
// To use: Set VITE_USE_MOCK=true in your .env file

export const mockLookups = {
  // Add mock data here if needed for development
  // Example:
  // 'cuisine-types': [
  //   { key: 'italian', value: 'italian', text: 'Italian' },
  //   { key: 'mexican', value: 'mexican', text: 'Mexican' },
  // ]
}

// Mock API interceptor for development
export function setupMockInterceptor() {
  // Only use in development when no backend is available
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const originalFetch = window.fetch
    
    // Override fetch (used by SurveyJS)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      
      // For the new restaurant survey API structure
      if (url.includes('/restaurant-survey/lookups/')) {
        console.log('Mock API call:', url)
        // Return empty array for now - add mock data as needed
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      
      // For survey submission
      if (url.includes('/responses')) {
        return new Response(JSON.stringify({
          response_id: `resp-${Date.now()}`,
          success: true,
          created_at: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // For survey definition
      if (url.includes('/survey')) {
        console.log('Mock survey request - returning 404 to use local survey')
        return new Response(null, { status: 404 })
      }
      
      // Fall back to original fetch for other requests
      return originalFetch(input, init)
    }
    
    console.log('Mock server interceptor enabled')
  }
}