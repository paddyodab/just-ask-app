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
    model.onLoadChoicesFromServer.add((sender, options) => {
      // For the new restaurant survey API, we don't need auth headers
      // since it uses customer hex in the URL
      const isNewApiStructure = options.url && (
        options.url.includes('/restaurant-survey/') || 
        options.url.includes('/30f8f53cf8034393b00665f664a60ddb/')
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
        const url = new URL(options.url, window.location.origin)
        url.searchParams.set('search', options.searchText)
        options.url = url.toString()
      }

      // Handle cascading dropdowns with parent values
      // The URL can contain placeholders like {parent_field}
      let finalUrl = options.url
      const regex = /{([^}]+)}/g
      let match
      
      while ((match = regex.exec(options.url)) !== null) {
        const fieldName = match[1]
        const fieldValue = sender.getValue(fieldName)
        if (fieldValue) {
          finalUrl = finalUrl.replace(`{${fieldName}}`, encodeURIComponent(fieldValue))
        }
      }
      
      console.log('SurveyJS URL transformation:', { original: options.url, final: finalUrl })
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