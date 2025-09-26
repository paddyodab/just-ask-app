/**
 * Formats survey response data for display
 * Handles complex objects like paneldynamic arrays
 */

export function formatResponseValue(value: any, fieldName?: string): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 'Not answered'
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  // Handle strings and numbers
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  // Handle arrays
  if (Array.isArray(value)) {
    // Check if it's a simple array of strings/numbers
    if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
      return value.join(', ')
    }

    // Handle paneldynamic arrays (arrays of objects)
    if (value.every(item => typeof item === 'object' && item !== null)) {
      return formatPanelDynamicArray(value, fieldName)
    }

    // Fallback for mixed arrays
    return value.map(item => formatResponseValue(item)).join(', ')
  }

  // Handle single objects (like a single panel entry)
  if (typeof value === 'object' && value !== null) {
    return formatPanelObject(value)
  }

  // Fallback
  return String(value)
}

/**
 * Formats a paneldynamic array (like Countries Visited)
 */
function formatPanelDynamicArray(panels: any[], fieldName?: string): string {
  if (panels.length === 0) {
    return 'None'
  }

  // Special formatting based on field name
  if (fieldName === 'visited_countries') {
    return panels.map((panel, index) => {
      const parts = []
      if (panel.country) parts.push(`Country: ${panel.country}`)
      if (panel.favorite_city) parts.push(`City: ${panel.favorite_city}`)
      if (panel.country_rating) parts.push(`Rating: ${panel.country_rating}/5`)
      return `[${index + 1}] ${parts.join(', ')}`
    }).join(' | ')
  }

  if (fieldName === 'bucket_list') {
    return panels.map((panel, index) => {
      const parts = []
      if (panel.dream_country) parts.push(`Country: ${panel.dream_country}`)
      if (panel.dream_city) parts.push(`City: ${panel.dream_city}`)
      if (panel.visit_reason) parts.push(`Reason: ${panel.visit_reason}`)
      return `[${index + 1}] ${parts.join(', ')}`
    }).join(' | ')
  }

  // Generic formatting for unknown panel types
  return panels.map((panel, index) => {
    const entries = Object.entries(panel)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
    return `[${index + 1}] ${entries.join(', ')}`
  }).join(' | ')
}

/**
 * Formats a single panel object
 */
function formatPanelObject(obj: any): string {
  const entries = Object.entries(obj)
    .filter(([key, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${formatResponseValue(value)}`)
  
  return entries.join(', ')
}

/**
 * Formats all responses for a survey
 */
export function formatSurveyResponses(responses: Record<string, any>): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(responses)) {
    formatted[key] = formatResponseValue(value, key)
  }
  
  return formatted
}

/**
 * Gets a display label for a field name
 */
export function getFieldLabel(fieldName: string, surveyJson?: any): string {
  // If we have the survey JSON, look up the actual question title
  if (surveyJson) {
    const question = findQuestionByName(surveyJson, fieldName)
    if (question?.title) {
      return question.title
    }
  }

  // Otherwise, format the field name nicely
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Finds a question in the survey JSON by its name
 */
function findQuestionByName(surveyJson: any, name: string): any {
  if (!surveyJson?.pages) return null

  for (const page of surveyJson.pages) {
    if (!page.elements) continue
    
    for (const element of page.elements) {
      if (element.name === name) {
        return element
      }
      
      // Check nested elements (panels, etc.)
      if (element.elements) {
        for (const nested of element.elements) {
          if (nested.name === name) {
            return nested
          }
        }
      }
      
      // Check paneldynamic template elements
      if (element.templateElements) {
        for (const template of element.templateElements) {
          if (template.name === name) {
            return template
          }
        }
      }
    }
  }
  
  return null
}

/**
 * Example usage for displaying responses
 */
export function createResponseDisplay(rawResponses: any): string {
  const formatted = formatSurveyResponses(rawResponses)
  
  let display = 'Survey Responses\n'
  display += '================\n\n'
  
  for (const [field, value] of Object.entries(formatted)) {
    const label = getFieldLabel(field)
    display += `${label}:\n${value}\n\n`
  }
  
  return display
}