// Mock server for development
// This simulates the backend API responses

export const mockLookups = {
  'market-areas': [
    { value: 'ma-001', text: 'North Region' },
    { value: 'ma-002', text: 'South Region' },
    { value: 'ma-003', text: 'East Region' },
    { value: 'ma-004', text: 'West Region' },
    { value: 'ma-005', text: 'Central Region' }
  ],
  'hospitals': {
    '10': [
      { value: 'hosp-001', text: 'General Hospital North' },
      { value: 'hosp-002', text: 'Regional Medical Center' },
      { value: 'hosp-003', text: 'North Community Hospital' }
    ],
    '101': [
      { value: 'hosp-004', text: 'South Medical Center' },
      { value: 'hosp-005', text: 'Southern Regional Hospital' }
    ],
    '10183': [
      { value: 'hosp-006', text: 'East General Hospital' },
      { value: 'hosp-007', text: 'Eastern Medical Center' }
    ],
    '10198': [
      { value: 'hosp-008', text: 'West Regional Hospital' },
      { value: 'hosp-009', text: 'Western Medical Center' }
    ],
    '10225': [
      { value: 'hosp-010', text: 'Central Hospital' },
      { value: 'hosp-011', text: 'Downtown Medical Center' }
    ],
    'ma-001': [
      { value: 'hosp-001', text: 'General Hospital North' },
      { value: 'hosp-002', text: 'Regional Medical Center' },
      { value: 'hosp-003', text: 'North Community Hospital' }
    ],
    'ma-002': [
      { value: 'hosp-004', text: 'South Medical Center' },
      { value: 'hosp-005', text: 'Southern Regional Hospital' }
    ],
    'ma-003': [
      { value: 'hosp-006', text: 'East General Hospital' },
      { value: 'hosp-007', text: 'Eastern Medical Center' }
    ],
    'ma-004': [
      { value: 'hosp-008', text: 'West Regional Hospital' },
      { value: 'hosp-009', text: 'Western Medical Center' }
    ],
    'ma-005': [
      { value: 'hosp-010', text: 'Central Hospital' },
      { value: 'hosp-011', text: 'Downtown Medical Center' }
    ]
  },
  'hospital-systems': {
    'hosp-001': [
      { value: 'sys-001', text: 'Northern Health System' },
      { value: 'sys-002', text: 'Regional Care Network' }
    ],
    'hosp-004': [
      { value: 'sys-003', text: 'Southern Health Alliance' },
      { value: 'sys-004', text: 'South Care System' }
    ]
  },
  'zip-codes': {
    '10': Array.from({ length: 50 }, (_, i) => ({
      value: `${10001 + i}`,
      text: `ZIP ${10001 + i} - Market 10`
    })),
    '101': Array.from({ length: 50 }, (_, i) => ({
      value: `${20001 + i}`,
      text: `ZIP ${20001 + i} - Market 101`
    })),
    '10183': Array.from({ length: 50 }, (_, i) => ({
      value: `${30001 + i}`,
      text: `ZIP ${30001 + i} - Market 10183`
    })),
    '10198': Array.from({ length: 50 }, (_, i) => ({
      value: `${40001 + i}`,
      text: `ZIP ${40001 + i} - Market 10198`
    })),
    '10225': Array.from({ length: 50 }, (_, i) => ({
      value: `${50001 + i}`,
      text: `ZIP ${50001 + i} - Market 10225`
    })),
    'ma-001': Array.from({ length: 50 }, (_, i) => ({
      value: `${10001 + i}`,
      text: `ZIP ${10001 + i} - North Region`
    })),
    'ma-002': Array.from({ length: 50 }, (_, i) => ({
      value: `${20001 + i}`,
      text: `ZIP ${20001 + i} - South Region`
    })),
    'ma-003': Array.from({ length: 50 }, (_, i) => ({
      value: `${30001 + i}`,
      text: `ZIP ${30001 + i} - East Region`
    })),
    'ma-004': Array.from({ length: 50 }, (_, i) => ({
      value: `${40001 + i}`,
      text: `ZIP ${40001 + i} - West Region`
    })),
    'ma-005': Array.from({ length: 50 }, (_, i) => ({
      value: `${50001 + i}`,
      text: `ZIP ${50001 + i} - Central Region`
    }))
  }
}

// Mock API interceptor for development
export function setupMockInterceptor() {
  // Only use in development when no backend is available
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    // Override both fetch AND XMLHttpRequest for mock responses
    const originalFetch = window.fetch
    
    // Override fetch (used by SurveyJS)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      
      // Check if this is a lookup API call
      if (url.includes('/api/v1/lookups/')) {
        const urlObj = new URL(url, window.location.origin)
        const pathParts = urlObj.pathname.split('/')
        const namespace = pathParts[pathParts.length - 1]
        const parentKey = urlObj.searchParams.get('parent_key')
        const search = urlObj.searchParams.get('search')
        
        console.log('Mock API call:', { namespace, parentKey, search })
        
        let data: any[] = []
        
        if (namespace === 'market-areas') {
          data = mockLookups['market-areas']
        } else if (namespace === 'hospitals') {
          if (parentKey) {
            data = (mockLookups.hospitals as any)[parentKey] || []
            console.log('Hospitals for parent', parentKey, ':', data)
          } else {
            // Return all hospitals if no parent key
            data = Object.values(mockLookups.hospitals).flat() as any[]
          }
        } else if (namespace === 'hospital-systems') {
          if (parentKey) {
            data = (mockLookups['hospital-systems'] as any)[parentKey] || []
          } else {
            data = Object.values(mockLookups['hospital-systems']).flat() as any[]
          }
        } else if (namespace === 'zip-codes') {
          if (parentKey) {
            data = (mockLookups['zip-codes'] as any)[parentKey] || []
          } else {
            data = Object.values(mockLookups['zip-codes']).flat() as any[]
          }
        }
        
        // Apply search filter if provided
        if (search && data.length > 0) {
          data = data.filter(item => 
            item.text.toLowerCase().includes(search.toLowerCase()) ||
            item.value.toLowerCase().includes(search.toLowerCase())
          )
        }
        
        // Return mock response
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      
      // For survey submission
      if (url.includes('/api/v1/surveys/') && url.includes('/responses')) {
        return new Response(JSON.stringify({
          id: `resp-${Date.now()}`,
          created_at: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Fall back to original fetch for other requests
      return originalFetch(input, init)
    }
    
    console.log('Mock server interceptor enabled')
  }
}