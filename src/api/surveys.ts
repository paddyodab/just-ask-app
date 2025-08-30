import { apiClient } from './client'
import { Survey } from '../types/survey'

export const surveysAPI = {
  // Get all surveys
  async getSurveys(): Promise<Survey[]> {
    const response = await apiClient.get<Survey[]>('/api/v1/surveys')
    return response.data
  },

  // Get a specific survey
  async getSurvey(id: string): Promise<Survey> {
    const response = await apiClient.get<Survey>(`/api/v1/surveys/${id}`)
    return response.data
  },

  // Create a new survey
  async createSurvey(data: {
    title: string
    description?: string
    schema: any
    settings?: any
  }): Promise<Survey> {
    const response = await apiClient.post<Survey>('/api/v1/surveys', data)
    return response.data
  },

  // Update a survey
  async updateSurvey(id: string, data: Partial<Survey>): Promise<Survey> {
    const response = await apiClient.put<Survey>(`/api/v1/surveys/${id}`, data)
    return response.data
  },

  // Delete a survey
  async deleteSurvey(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/surveys/${id}`)
  },

  // Submit survey response
  async submitResponse(surveyId: string, data: any): Promise<{
    id: string
    created_at: string
  }> {
    const response = await apiClient.post(
      `/api/v1/surveys/${surveyId}/responses`,
      data
    )
    return response.data
  }
}