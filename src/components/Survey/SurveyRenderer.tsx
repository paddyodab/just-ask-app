import React, { useEffect, useState } from 'react'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/defaultV2.css'
import { getAuthToken, getTenantId } from '../../utils/auth'

interface SurveyRendererProps {
  surveyJson: any
  onComplete?: (sender: Model) => void
  onValueChanged?: (sender: Model, options: any) => void
}

export const SurveyRenderer: React.FC<SurveyRendererProps> = ({ 
  surveyJson, 
  onComplete,
  onValueChanged
}) => {
  const [survey, setSurvey] = useState<Model | null>(null)

  useEffect(() => {
    const model = new Model(surveyJson)
    
    // Configure choicesByUrl authentication and dynamic URLs
    model.onLoadChoicesFromServer.add((sender, options: any) => {
      // Check if this is using the new API structure with customer hex in URL
      // The new API structure has customer hex and namespace in the path
      const url = options.url as string
      const isNewApiStructure = url && (
        // Check for hex pattern (32 characters) followed by namespace
        /\/[a-f0-9]{32}\/[\w-]+\//.test(url)
      )
      
      if (!isNewApiStructure) {
        // Add auth headers for old API structure
        options.setHeaders = {
          'Authorization': `Bearer ${getAuthToken()}`,
          'X-Tenant-ID': getTenantId()
        }
      }
      
      // Handle search for large lists
      const question = options.question
      if ((question as any).searchEnabled && options.searchText) {
        const urlObj = new URL(url, window.location.origin)
        urlObj.searchParams.set('search', options.searchText)
        options.url = urlObj.toString()
      }

      // Handle cascading dropdowns with parent values
      // The URL can contain placeholders like {parent_field}
      let finalUrl = url
      const regex = /{([^}]+)}/g
      let match
      
      while ((match = regex.exec(url)) !== null) {
        const fieldName = match[1]
        const fieldValue = sender.getValue(fieldName)
        if (fieldValue) {
          finalUrl = finalUrl.replace(`{${fieldName}}`, encodeURIComponent(fieldValue))
        }
      }
      
      console.log('SurveyJS URL transformation:', { original: url, final: finalUrl })
      options.url = finalUrl
      
      // Add callback to process the result
      if (options.onProcessItems) {
        const originalCallback = options.onProcessItems
        options.onProcessItems = (items: any[]) => {
          console.log('SurveyJS received items:', items)
          return originalCallback ? originalCallback(items) : items
        }
      } else {
        options.onProcessItems = (items: any[]) => {
          console.log('SurveyJS received items:', items)
          return items
        }
      }
    })

    // Handle value changes for dependent dropdowns
    if (onValueChanged) {
      model.onValueChanged.add(onValueChanged)
    }
    
    // Handle completion
    if (onComplete) {
      model.onComplete.add(onComplete)
    }
    
    setSurvey(model)

    // Cleanup
    return () => {
      if (onValueChanged) {
        model.onValueChanged.remove(onValueChanged)
      }
      if (onComplete) {
        model.onComplete.remove(onComplete)
      }
    }
  }, [surveyJson, onComplete, onValueChanged])

  if (!survey) return <div>Loading survey...</div>

  return <Survey model={survey} />
}

export default SurveyRenderer