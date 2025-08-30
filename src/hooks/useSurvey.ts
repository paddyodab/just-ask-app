import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { surveysAPI } from '../api/surveys'
import { Survey } from '../types/survey'

export function useSurveys() {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: surveysAPI.getSurveys,
  })
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysAPI.getSurvey(id),
    enabled: !!id,
  })
}

export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: surveysAPI.createSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: string; data: Partial<Survey> }) =>
      surveysAPI.updateSurvey(params.id, params.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['survey', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: surveysAPI.deleteSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useSubmitSurveyResponse() {
  return useMutation({
    mutationFn: (params: { surveyId: string; data: any }) =>
      surveysAPI.submitResponse(params.surveyId, params.data),
  })
}