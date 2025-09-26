// Simple mock server for testing typeahead functionality
// This loads the CSV data from the typeahead-survey-data folder

// Helper function to parse CSV data
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  return lines.slice(1).map(line => {
    // Handle CSV values that might contain commas within quotes
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj
  })
}

// Store parsed data
let countriesData: any[] = []
let citiesData: any[] = []
let airlinesData: any[] = []
let airportsData: any[] = []

// Load CSV data asynchronously
async function loadMockData() {
  try {
    // Load countries
    const countriesResponse = await fetch('/typeahead-survey-data/countries.csv')
    if (countriesResponse.ok) {
      const csvText = await countriesResponse.text()
      countriesData = parseCSV(csvText).map(c => ({
        key: c.code,
        value: c.name,
        text: c.name,
        region: c.region
      }))
    }

    // Load cities
    const citiesResponse = await fetch('/typeahead-survey-data/cities.csv')
    if (citiesResponse.ok) {
      const csvText = await citiesResponse.text()
      citiesData = parseCSV(csvText).map(c => ({
        key: c.id,
        value: c.name,
        text: c.name_with_country,
        country_code: c.country_code,
        population: c.population
      }))
    }

    // Load airlines
    const airlinesResponse = await fetch('/typeahead-survey-data/airlines.csv')
    if (airlinesResponse.ok) {
      const csvText = await airlinesResponse.text()
      airlinesData = parseCSV(csvText).map(a => ({
        key: a.code,
        value: a.name,
        text: `${a.name} (${a.code})`,
        country: a.country,
        alliance: a.alliance
      }))
    }

    // Load airports
    const airportsResponse = await fetch('/typeahead-survey-data/airports.csv')
    if (airportsResponse.ok) {
      const csvText = await airportsResponse.text()
      airportsData = parseCSV(csvText).map(a => ({
        key: a.code,
        value: a.name,
        text: a.name_with_code,
        city: a.city,
        country: a.country
      }))
    }

    console.log('Typeahead mock data loaded:', {
      countries: countriesData.length,
      cities: citiesData.length,
      airlines: airlinesData.length,
      airports: airportsData.length
    })
  } catch (error) {
    console.error('Error loading mock data:', error)
    console.log('Using fallback data...')
    
    // Provide some fallback data so the demo still works
    countriesData = [
      { key: 'US', value: 'United States', text: 'United States' },
      { key: 'GB', value: 'United Kingdom', text: 'United Kingdom' },
      { key: 'CA', value: 'Canada', text: 'Canada' },
      { key: 'AU', value: 'Australia', text: 'Australia' },
      { key: 'FR', value: 'France', text: 'France' },
      { key: 'DE', value: 'Germany', text: 'Germany' },
      { key: 'JP', value: 'Japan', text: 'Japan' },
      { key: 'CN', value: 'China', text: 'China' },
      { key: 'BR', value: 'Brazil', text: 'Brazil' },
      { key: 'IN', value: 'India', text: 'India' }
    ]
    
    citiesData = [
      { key: 'NYC', value: 'New York', text: 'New York, United States', country_code: 'US' },
      { key: 'LON', value: 'London', text: 'London, United Kingdom', country_code: 'GB' },
      { key: 'PAR', value: 'Paris', text: 'Paris, France', country_code: 'FR' },
      { key: 'TOK', value: 'Tokyo', text: 'Tokyo, Japan', country_code: 'JP' },
      { key: 'SYD', value: 'Sydney', text: 'Sydney, Australia', country_code: 'AU' }
    ]
  }
}

// Setup mock interceptor for typeahead testing
export async function setupTypeaheadMockServer() {
  console.log('Setting up typeahead mock server...')
  console.log('VITE_USE_MOCK:', import.meta.env.VITE_USE_MOCK)
  
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCK !== 'true') {
    console.log('Mock server disabled (not in dev mode or VITE_USE_MOCK is not true)')
    return
  }

  // Load the mock data first
  await loadMockData()
  
  // Store original fetch if not already stored
  const originalFetch = (window as any).__originalFetch || window.fetch
  ;(window as any).__originalFetch = originalFetch
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    
    // Only intercept our test endpoints (using /mock-api to avoid conflicts)
    const isTestEndpoint = url.includes('/mock-api/countries') ||
                          url.includes('/mock-api/cities') ||
                          url.includes('/mock-api/all_cities') ||
                          url.includes('/mock-api/airlines') ||
                          url.includes('/mock-api/airports') ||
                          // Also support the original /api URLs if needed
                          url.includes('/api/lookups/countries') ||
                          url.includes('/api/lookups/cities') ||
                          url.includes('/api/lookups/all_cities') ||
                          url.includes('/api/lookups/airlines') ||
                          url.includes('/api/lookups/airports')
    
    if (!isTestEndpoint) {
      return originalFetch(input, init)
    }
    
    console.log('Mock server intercepting:', url)
    
    // Parse URL for parameters
    const urlObj = new URL(url, window.location.origin)
    const searchParam = urlObj.searchParams.get('search')?.toLowerCase() || ''
    const countryParam = urlObj.searchParams.get('country')
    const sizeParam = urlObj.searchParams.get('size')
    const size = sizeParam ? parseInt(sizeParam) : 20
    
    // Mock API routes for testing
    if (url.includes('/countries')) {
      console.log('Mock countries lookup:', { search: searchParam })
      let results = countriesData
      
      if (searchParam && searchParam.length >= 2) {
        results = results.filter(item => 
          item.value.toLowerCase().includes(searchParam) ||
          item.key.toLowerCase().includes(searchParam)
        )
      }
      
      return new Response(JSON.stringify(results.slice(0, size)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (url.includes('/cities') && !url.includes('/all_cities')) {
      console.log('Mock cities lookup:', { country: countryParam, search: searchParam })
      let results = citiesData
      
      // Filter by country if specified
      if (countryParam) {
        // Map country name to code if needed
        let countryCode = countryParam
        
        // If the parameter looks like a country name rather than a code (longer than 2 chars)
        if (countryParam.length > 2) {
          const country = countriesData.find(c => 
            c.value.toLowerCase() === countryParam.toLowerCase()
          )
          if (country) {
            countryCode = country.key
          }
        }
        
        console.log('Filtering cities by country code:', countryCode)
        results = results.filter(city => city.country_code === countryCode)
      }
      
      // Filter by search term
      if (searchParam && searchParam.length >= 2) {
        results = results.filter(item => 
          item.value.toLowerCase().includes(searchParam) ||
          item.text.toLowerCase().includes(searchParam)
        )
      }
      
      return new Response(JSON.stringify(results.slice(0, size)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (url.includes('/all_cities')) {
      console.log('Mock all cities lookup:', { search: searchParam })
      let results = citiesData
      
      if (searchParam && searchParam.length >= 2) {
        results = results.filter(item => 
          item.text.toLowerCase().includes(searchParam) ||
          item.value.toLowerCase().includes(searchParam)
        )
      }
      
      // Format for display with country
      const formattedResults = results.map(city => ({
        key: city.key,
        value: city.text,
        text: city.text
      }))
      
      return new Response(JSON.stringify(formattedResults.slice(0, size)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (url.includes('/airlines')) {
      console.log('Mock airlines lookup:', { search: searchParam })
      let results = airlinesData
      
      if (searchParam && searchParam.length >= 2) {
        results = results.filter(item => 
          item.value.toLowerCase().includes(searchParam) ||
          item.key.toLowerCase().includes(searchParam) ||
          item.country.toLowerCase().includes(searchParam)
        )
      }
      
      return new Response(JSON.stringify(results.slice(0, size)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (url.includes('/airports')) {
      console.log('Mock airports lookup:', { search: searchParam })
      let results = airportsData
      
      if (searchParam && searchParam.length >= 2) {
        results = results.filter(item => 
          item.value.toLowerCase().includes(searchParam) ||
          item.key.toLowerCase().includes(searchParam) ||
          item.city.toLowerCase().includes(searchParam) ||
          item.text.toLowerCase().includes(searchParam)
        )
      }
      
      return new Response(JSON.stringify(results.slice(0, size)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Handle survey submission
    if (url.includes('/api/responses')) {
      return new Response(JSON.stringify({
        response_id: `resp-${Date.now()}`,
        success: true,
        created_at: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Fall back to original fetch for other requests
    return originalFetch(input, init)
  }
  
  // Also intercept XMLHttpRequest (which SurveyJS uses)
  const originalXHROpen = XMLHttpRequest.prototype.open
  const originalXHRSend = XMLHttpRequest.prototype.send
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader
  
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, ...args: any[]) {
    const urlString = url.toString()
    
    // Store the URL and method for later use
    ;(this as any)._mockUrl = urlString
    ;(this as any)._mockMethod = method
    ;(this as any)._mockHeaders = {}
    
    // Check if this is one of our mock endpoints
    const isTestEndpoint = urlString.includes('/mock-api/countries') ||
                          urlString.includes('/mock-api/cities') ||
                          urlString.includes('/mock-api/all_cities') ||
                          urlString.includes('/mock-api/airlines') ||
                          urlString.includes('/mock-api/airports')
    
    if (isTestEndpoint) {
      console.log('XHR intercepted for mock:', urlString)
      ;(this as any)._isMockEndpoint = true
      
      // Simulate opened state
      Object.defineProperty(this, 'readyState', { 
        value: 1,
        writable: true,
        configurable: true 
      })
      
      // Return without calling the original open
      return
    }
    
    // For non-mock endpoints, use original XHR
    return originalXHROpen.call(this, method, url, async, ...args)
  }
  
  XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string) {
    if ((this as any)._isMockEndpoint) {
      // Store headers for mock endpoints
      ;(this as any)._mockHeaders[name] = value
      return
    }
    return originalXHRSetRequestHeader.apply(this, arguments as any)
  }
  
  XMLHttpRequest.prototype.send = function(body?: any) {
    if ((this as any)._isMockEndpoint) {
      const url = (this as any)._mockUrl
      const method = (this as any)._mockMethod
      
      console.log('XHR send for mock:', url)
      
      // Use setTimeout to make it async
      setTimeout(async () => {
        try {
          const response = await fetch(url, { 
            method, 
            body,
            headers: (this as any)._mockHeaders 
          })
          const responseText = await response.text()
          
          // Simulate XHR response
          Object.defineProperty(this, 'readyState', { value: 4, configurable: true })
          Object.defineProperty(this, 'status', { value: response.status, configurable: true })
          Object.defineProperty(this, 'statusText', { value: response.statusText, configurable: true })
          Object.defineProperty(this, 'responseText', { value: responseText, configurable: true })
          Object.defineProperty(this, 'response', { value: responseText, configurable: true })
          
          // Trigger events
          if (this.onreadystatechange) {
            this.onreadystatechange(new Event('readystatechange') as any)
          }
          
          if (this.onload) {
            this.onload(new ProgressEvent('load') as any)
          }
          
          this.dispatchEvent(new Event('readystatechange'))
          this.dispatchEvent(new ProgressEvent('load'))
        } catch (error) {
          console.error('XHR mock error:', error)
          
          Object.defineProperty(this, 'readyState', { value: 4, configurable: true })
          Object.defineProperty(this, 'status', { value: 0, configurable: true })
          
          if (this.onerror) {
            this.onerror(new ProgressEvent('error') as any)
          }
          
          this.dispatchEvent(new ProgressEvent('error'))
        }
      }, 0)
      
      return
    }
    
    return originalXHRSend.apply(this, arguments as any)
  }
  
  console.log('Typeahead mock server enabled - ready to test!')
}