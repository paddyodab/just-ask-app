// Mock server for development
// This simulates the backend API responses when no backend is available
// To use: Set VITE_USE_MOCK=true in your .env file

export const mockLookups = {
  countries: [
    { key: 'us', value: 'United States' },
    { key: 'ca', value: 'Canada' },
    { key: 'mx', value: 'Mexico' },
    { key: 'uk', value: 'United Kingdom' },
    { key: 'fr', value: 'France' },
    { key: 'de', value: 'Germany' },
    { key: 'it', value: 'Italy' },
    { key: 'es', value: 'Spain' },
    { key: 'jp', value: 'Japan' },
    { key: 'cn', value: 'China' },
    { key: 'in', value: 'India' },
    { key: 'br', value: 'Brazil' },
    { key: 'ar', value: 'Argentina' },
    { key: 'au', value: 'Australia' },
    { key: 'nz', value: 'New Zealand' },
    { key: 'za', value: 'South Africa' },
    { key: 'eg', value: 'Egypt' },
    { key: 'ng', value: 'Nigeria' },
    { key: 'ke', value: 'Kenya' },
    { key: 'ru', value: 'Russia' }
  ],
  cities: {
    us: [
      { key: 'nyc', value: 'New York City', parent_key: 'us' },
      { key: 'la', value: 'Los Angeles', parent_key: 'us' },
      { key: 'chi', value: 'Chicago', parent_key: 'us' },
      { key: 'hou', value: 'Houston', parent_key: 'us' },
      { key: 'phx', value: 'Phoenix', parent_key: 'us' }
    ],
    ca: [
      { key: 'tor', value: 'Toronto', parent_key: 'ca' },
      { key: 'van', value: 'Vancouver', parent_key: 'ca' },
      { key: 'mtl', value: 'Montreal', parent_key: 'ca' },
      { key: 'cal', value: 'Calgary', parent_key: 'ca' }
    ],
    uk: [
      { key: 'lon', value: 'London', parent_key: 'uk' },
      { key: 'man', value: 'Manchester', parent_key: 'uk' },
      { key: 'bir', value: 'Birmingham', parent_key: 'uk' },
      { key: 'edi', value: 'Edinburgh', parent_key: 'uk' }
    ]
  },
  employees: [
    { key: 'emp001', value: 'John Smith - Engineering' },
    { key: 'emp002', value: 'Jane Doe - Marketing' },
    { key: 'emp003', value: 'Bob Johnson - Sales' },
    { key: 'emp004', value: 'Alice Williams - HR' },
    { key: 'emp005', value: 'Charlie Brown - Finance' },
    { key: 'emp006', value: 'Diana Prince - Operations' },
    { key: 'emp007', value: 'Edward Norton - Legal' },
    { key: 'emp008', value: 'Fiona Green - IT' },
    { key: 'emp009', value: 'George White - Product' },
    { key: 'emp010', value: 'Helen Black - Design' },
    { key: 'emp011', value: 'Ian Gray - Support' },
    { key: 'emp012', value: 'Julia Red - QA' },
    { key: 'emp013', value: 'Kevin Blue - DevOps' },
    { key: 'emp014', value: 'Laura Yellow - Data Science' },
    { key: 'emp015', value: 'Michael Purple - Security' }
  ]
}

// Mock API interceptor for development
export function setupMockInterceptor() {
  // Only use in development when no backend is available
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const originalFetch = window.fetch
    
    // Override fetch (used by SurveyJS)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      
      // Parse URL for mock lookup handling
      const urlObj = new URL(url, window.location.origin)
      const searchParam = urlObj.searchParams.get('search')
      const parentKey = urlObj.searchParams.get('parent_key')
      const sizeParam = urlObj.searchParams.get('size')
      const size = sizeParam ? parseInt(sizeParam) : 100
      
      // Handle lookups with typeahead search
      if (url.includes('/lookups/countries')) {
        console.log('Mock countries lookup:', { search: searchParam })
        let results = mockLookups.countries
        
        if (searchParam && searchParam.length >= 2) {
          results = results.filter(item => 
            item.value.toLowerCase().includes(searchParam.toLowerCase())
          )
        }
        
        return new Response(JSON.stringify(results.slice(0, size)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (url.includes('/lookups/cities')) {
        console.log('Mock cities lookup:', { parentKey, search: searchParam })
        let results: any[] = []
        
        if (parentKey && mockLookups.cities[parentKey as keyof typeof mockLookups.cities]) {
          results = mockLookups.cities[parentKey as keyof typeof mockLookups.cities]
        } else {
          // Return all cities if no parent
          results = Object.values(mockLookups.cities).flat()
        }
        
        if (searchParam && searchParam.length >= 2) {
          results = results.filter(item => 
            item.value.toLowerCase().includes(searchParam.toLowerCase())
          )
        }
        
        return new Response(JSON.stringify(results.slice(0, size)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (url.includes('/lookups/employees')) {
        console.log('Mock employees lookup:', { search: searchParam })
        let results = mockLookups.employees
        
        if (searchParam && searchParam.length >= 2) {
          results = results.filter(item => 
            item.value.toLowerCase().includes(searchParam.toLowerCase())
          )
        }
        
        return new Response(JSON.stringify(results.slice(0, size)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
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