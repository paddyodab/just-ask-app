export interface SurveyJSChoice {
  value: string
  text: string
}

export interface Lookup {
  id: string
  tenant_id: string
  namespace: string
  key: string
  value: {
    value: string
    text: string
    [key: string]: any
  }
  version: number
  parent_key?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LookupQuery {
  namespace: string
  parent_key?: string
  search?: string
  page?: number
  size?: number
}

export interface LookupBulkImport {
  namespace: string
  lookups: Array<{
    key?: string
    value: string
    text: string
    parent_key?: string
    metadata?: Record<string, any>
  }>
  replace_existing?: boolean
}