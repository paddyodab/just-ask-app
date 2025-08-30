import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lookupsAPI } from '../api/lookups'
import { LookupQuery, LookupBulkImport } from '../types/lookup'

export function useLookups(query: LookupQuery) {
  return useQuery({
    queryKey: ['lookups', query],
    queryFn: () => lookupsAPI.getNamespaceLookups(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!query.namespace,
  })
}

export function useSpecificLookup(namespace: string, key: string) {
  return useQuery({
    queryKey: ['lookup', namespace, key],
    queryFn: () => lookupsAPI.getSpecificLookup(namespace, key),
    enabled: !!namespace && !!key,
  })
}

export function useBulkImportLookups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LookupBulkImport) => lookupsAPI.bulkImport(data),
    onSuccess: (_, variables) => {
      // Invalidate all queries for this namespace
      queryClient.invalidateQueries({ 
        queryKey: ['lookups', { namespace: variables.namespace }] 
      })
    },
  })
}

export function useUpdateLookup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      namespace: string
      key: string
      data: { value?: any; metadata?: any }
    }) => lookupsAPI.updateLookup(params.namespace, params.key, params.data),
    onSuccess: (_, variables) => {
      // Invalidate specific lookup and namespace queries
      queryClient.invalidateQueries({ 
        queryKey: ['lookup', variables.namespace, variables.key] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['lookups', { namespace: variables.namespace }] 
      })
    },
  })
}

export function useDeleteLookup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { namespace: string; key: string }) =>
      lookupsAPI.deleteLookup(params.namespace, params.key),
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: ['lookups', { namespace: variables.namespace }] 
      })
    },
  })
}