import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { setupMockInterceptor } from './mocks/mockServer'
import { setupTypeaheadMockServer } from './mocks/typeaheadMockServer'
import './index.css'

// Setup mock servers in development
// Initialize typeahead mock server if on the test page
if (window.location.pathname === '/typeahead-test') {
  setupTypeaheadMockServer()
} else {
  setupMockInterceptor()
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)