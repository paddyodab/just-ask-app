export interface Survey {
  id: string
  tenant_id: string
  title: string
  description?: string
  schema: any // SurveyJS JSON schema
  settings?: Record<string, any>
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}