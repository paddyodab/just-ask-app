import { apiClient } from './client'
import { SurveyJSChoice, Lookup, LookupQuery, LookupBulkImport } from '../types/lookup'
import { persistentCache } from '../utils/cache'

export const lookupsAPI = {
  // Get lookups for a namespace in SurveyJS format
  async getNamespaceLookups(query: LookupQuery): Promise<SurveyJSChoice[]> {
    const cacheKey = `lookups:${JSON.stringify(query)}`
    
    // Check cache first
    const cached = persistentCache.get<SurveyJSChoice[]>(cacheKey)
    if (cached) {
      return cached
    }

    const params = new URLSearchParams()
    if (query.parent_key) params.append('parent_key', query.parent_key)
    if (query.search) params.append('search', query.search)
    if (query.page) params.append('page', query.page.toString())
    if (query.size) params.append('size', query.size.toString())

    const response = await apiClient.get<SurveyJSChoice[]>(
      `/api/v1/lookups/${query.namespace}?${params.toString()}`
    )

    // Cache the result
    persistentCache.set(cacheKey, response.data, 3600000) // 1 hour
    
    return response.data
  },

  // Get a specific lookup by key
  async getSpecificLookup(namespace: string, key: string): Promise<Lookup> {
    const response = await apiClient.get<Lookup>(
      `/api/v1/lookups/${namespace}/${key}`
    )
    return response.data
  },

  // Bulk import lookups
  async bulkImport(data: LookupBulkImport): Promise<{
    created: number
    updated: number
    total: number
  }> {
    const response = await apiClient.post('/api/v1/lookups/bulk', data)
    
    // Clear cache for this namespace
    persistentCache.clear()
    
    return response.data
  },

  // Update a specific lookup
  async updateLookup(
    namespace: string,
    key: string,
    data: {
      value?: any
      metadata?: any
    }
  ): Promise<{ success: boolean; version: number }> {
    const response = await apiClient.put(
      `/api/v1/lookups/${namespace}/${key}`,
      data
    )
    
    // Clear cache for this namespace
    persistentCache.clear()
    
    return response.data
  },

  // Delete a lookup (soft delete)
  async deleteLookup(namespace: string, key: string): Promise<void> {
    await apiClient.delete(`/api/v1/lookups/${namespace}/${key}`)
    
    // Clear cache for this namespace
    persistentCache.clear()
  }
}