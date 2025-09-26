import React, { useEffect, useState } from 'react'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import { 
  DefaultLight,
  DefaultDark,
  DefaultLightPanelless,
  DefaultDarkPanelless,
  Sharp,
  SharpDark,
  Borderless,
  BorderlessDark,
  Flat,
  FlatDark,
  Plain,
  PlainDark,
  DoubleBorder,
  DoubleBorderDark,
  LayeredLight,
  LayeredDark,
  SolidLight,
  SolidDark,
  ThreeDimensionalLight,
  ThreeDimensionalDark,
  Contrast,
  ContrastDark
} from 'survey-core/themes'
import 'survey-core/defaultV2.css'
import './survey-theme.css'
import './theme-switcher.css'
import './typeahead-dropdown.css'
import { getAuthToken, getTenantId } from '../../utils/auth'
import { assetLoader, type AssetConfig } from '../../utils/assetLoader'
import { debounce } from '../../utils/debounce'
import { registerTypeaheadWidget } from './TypeaheadDropdownWidget'

// Register the typeahead widget
registerTypeaheadWidget()

// Available themes configuration
const AVAILABLE_THEMES = [
  { name: 'Default Light', theme: DefaultLight, value: 'default-light' },
  { name: 'Default Dark', theme: DefaultDark, value: 'default-dark' },
  { name: 'Sharp', theme: Sharp, value: 'sharp' },
  { name: 'Sharp Dark', theme: SharpDark, value: 'sharp-dark' },
  { name: 'Borderless', theme: Borderless, value: 'borderless' },
  { name: 'Borderless Dark', theme: BorderlessDark, value: 'borderless-dark' },
  { name: 'Flat', theme: Flat, value: 'flat' },
  { name: 'Flat Dark', theme: FlatDark, value: 'flat-dark' },
  { name: 'Plain', theme: Plain, value: 'plain' },
  { name: 'Plain Dark', theme: PlainDark, value: 'plain-dark' },
  { name: 'Double Border', theme: DoubleBorder, value: 'double-border' },
  { name: 'Double Border Dark', theme: DoubleBorderDark, value: 'double-border-dark' },
  { name: 'Layered Light', theme: LayeredLight, value: 'layered-light' },
  { name: 'Layered Dark', theme: LayeredDark, value: 'layered-dark' },
  { name: 'Solid Light', theme: SolidLight, value: 'solid-light' },
  { name: 'Solid Dark', theme: SolidDark, value: 'solid-dark' },
  { name: '3D Light', theme: ThreeDimensionalLight, value: '3d-light' },
  { name: '3D Dark', theme: ThreeDimensionalDark, value: '3d-dark' },
  { name: 'Contrast', theme: Contrast, value: 'contrast' },
  { name: 'Contrast Dark', theme: ContrastDark, value: 'contrast-dark' },
  { name: 'Panelless Light', theme: DefaultLightPanelless, value: 'panelless-light' },
  { name: 'Panelless Dark', theme: DefaultDarkPanelless, value: 'panelless-dark' }
]

interface SurveyRendererProps {
  surveyJson: any
  onComplete?: (sender: Model) => void
  onValueChanged?: (sender: Model, options: any) => void
  tenantId?: string
  namespace?: string
}

export const SurveyRenderer: React.FC<SurveyRendererProps> = ({ 
  surveyJson, 
  onComplete,
  onValueChanged,
  tenantId,
  namespace
}) => {
  const [survey, setSurvey] = useState<Model | null>(null)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    // Load saved theme from localStorage or default to 'default-light'
    return localStorage.getItem('surveyTheme') || 'default-light'
  })
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [assetsLoaded, setAssetsLoaded] = useState(false)

  // Load assets when survey JSON changes
  useEffect(() => {
    const loadAssets = async () => {
      if (!surveyJson?.assets || !tenantId || !namespace) {
        setAssetsLoaded(true)
        return
      }

      try {
        const assets: AssetConfig = surveyJson.assets
        const surveyId = surveyJson.id || 'default'

        // Process and load stylesheets
        if (assets.stylesheets && assets.stylesheets.length > 0) {
          const processedUrls = assets.stylesheets.map(url => 
            assetLoader.processAssetUrl(url, tenantId, namespace)
          )
          await assetLoader.loadStylesheets(processedUrls, surveyId)
        }

        // Apply CSS variables if colors are specified
        if (assets.primaryColor || assets.secondaryColor || assets.customVariables) {
          const cssVariables = assetLoader.buildCSSVariables(assets)
          assetLoader.injectCSSVariables(cssVariables, surveyId)
        }

        setAssetsLoaded(true)
      } catch (error) {
        console.error('Error loading survey assets:', error)
        setAssetsLoaded(true) // Continue even if assets fail to load
      }
    }

    loadAssets()

    // Cleanup on unmount
    return () => {
      if (surveyJson?.id) {
        assetLoader.cleanup(surveyJson.id)
      }
    }
  }, [surveyJson, tenantId, namespace])

  // Apply theme whenever it changes
  useEffect(() => {
    if (survey) {
      const selectedTheme = AVAILABLE_THEMES.find(t => t.value === currentTheme)
      if (selectedTheme) {
        survey.applyTheme(selectedTheme.theme)
      }
    }
  }, [currentTheme, survey])

  // Handle theme change
  const handleThemeChange = (themeValue: string) => {
    setCurrentTheme(themeValue)
    localStorage.setItem('surveyTheme', themeValue)
    setShowThemeSelector(false)
  }

  useEffect(() => {
    // Preprocess the survey JSON to add API URL to choicesByUrl
    const processedSurveyJson = JSON.parse(JSON.stringify(surveyJson))
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    
    const processQuestions = (questions: any[]) => {
      questions?.forEach(question => {
        if (question.choicesByUrl?.url && question.choicesByUrl.url.startsWith('/')) {
          // Don't prepend API URL for mock-api endpoints when in mock mode
          if (import.meta.env.VITE_USE_MOCK === 'true' && question.choicesByUrl.url.startsWith('/mock-api/')) {
            // Keep the URL as-is for mock endpoints
            console.log(`Mock URL for ${question.name}:`, question.choicesByUrl.url)
          } else {
            question.choicesByUrl.url = `${apiUrl}${question.choicesByUrl.url}`
            console.log(`Modified URL for ${question.name}:`, question.choicesByUrl.url)
          }
        }
        
        // Enable typeahead for dropdowns with large datasets
        if (question.type === 'dropdown' && question.enableTypeahead) {
          // Don't enable built-in search when using custom typeahead widget
          // The custom widget handles search functionality
          question.choicesLazyLoadEnabled = false
          question.searchEnabled = false
        }
        
        // Handle nested questions in panels
        if (question.elements) {
          processQuestions(question.elements)
        }
      })
    }
    
    // Process all pages
    processedSurveyJson.pages?.forEach((page: any) => {
      if (page.elements) {
        processQuestions(page.elements)
      }
    })

    const model = new Model(processedSurveyJson)
    
    // Disable browser autocomplete on all inputs
    model.onAfterRenderQuestion.add((sender, options) => {
      const inputElements = options.htmlElement.querySelectorAll('input, select')
      inputElements.forEach((el: any) => {
        el.setAttribute('autocomplete', 'off')
        el.setAttribute('data-form-type', 'other')
      })
    })
    
    // Process logo URL if present
    if (surveyJson.logo && tenantId && namespace) {
      model.logo = assetLoader.processAssetUrl(surveyJson.logo, tenantId, namespace)
    }
    
    // Apply initial theme (check if custom theme from assets first)
    if (surveyJson.assets?.theme) {
      const customTheme = AVAILABLE_THEMES.find(t => t.value === surveyJson.assets.theme)
      if (customTheme) {
        model.applyTheme(customTheme.theme)
      }
    } else {
      const selectedTheme = AVAILABLE_THEMES.find(t => t.value === currentTheme)
      if (selectedTheme) {
        model.applyTheme(selectedTheme.theme)
      }
    }
    
    // Configure choicesByUrl authentication and dynamic URLs
    model.onLoadChoicesFromServer.add((sender, options: any) => {
      console.log('SurveyJS onLoadChoicesFromServer options:', options)
      
      // The URL might be in options.request.url for newer versions of SurveyJS
      let url = options.url || (options.request && options.request.url)
      console.log('Initial URL from SurveyJS:', url)
      
      // Add API URL prefix if the URL starts with /
      if (url && url.startsWith('/')) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        console.log('Adding API URL prefix:', apiUrl)
        url = `${apiUrl}${url}`
        console.log('URL after adding prefix:', url)
        
        // Update the URL in the right place
        if (options.request) {
          options.request.url = url
        } else {
          options.url = url
        }
      }
      
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
      
      // Handle typeahead search
      const question = options.question
      const searchText = options.filter || options.searchText || ''
      
      if (question.enableTypeahead && searchText.length >= 2) {
        const urlObj = new URL(url)
        urlObj.searchParams.set('search', searchText)
        urlObj.searchParams.set('size', '20') // Limit results for performance
        url = urlObj.toString()
        console.log(`Typeahead search for "${searchText}" on ${question.name}:`, url)
      }

      // Handle cascading dropdowns with parent values
      // The URL can contain placeholders like {parent_field}
      let finalUrl = url
      const regex = /{([^}]+)}/g
      let match
      
      while ((match = regex.exec(finalUrl)) !== null) {
        const fieldName = match[1]
        const fieldValue = sender.getValue(fieldName)
        if (fieldValue) {
          finalUrl = finalUrl.replace(`{${fieldName}}`, encodeURIComponent(fieldValue))
        }
      }
      
      console.log('SurveyJS URL transformation:', { original: url, final: finalUrl })
      
      // Update the URL in the right place
      if (options.request) {
        options.request.url = finalUrl
      } else {
        options.url = finalUrl
      }
      
      // Add error handling
      options.onError = (error: any) => {
        console.error('Error loading choices from:', finalUrl, error)
      }
      
      // Add callback to process the result
      const originalCallback = options.onProcessItems
      options.onProcessItems = (items: any[]) => {
        console.log('SurveyJS received items from', finalUrl, ':', items)
        
        // Check if the items need to be transformed
        if (items && items.length > 0 && items[0].key && items[0].value) {
          console.log('Transforming key-value pairs to SurveyJS format')
          // Transform key-value pairs to SurveyJS expected format
          const transformed = items.map(item => ({
            value: item.key,
            text: item.value
          }))
          return originalCallback ? originalCallback(transformed) : transformed
        }
        
        return originalCallback ? originalCallback(items) : items
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
    
    // Expose survey for debugging and custom widgets
    if (import.meta.env.DEV) {
      (window as any).currentSurvey = model
    }

    // Cleanup
    return () => {
      if (onValueChanged) {
        model.onValueChanged.remove(onValueChanged)
      }
      if (onComplete) {
        model.onComplete.remove(onComplete)
      }
    }
  }, [surveyJson, onComplete, onValueChanged, currentTheme])

  if (!survey || !assetsLoaded) return <div>Loading survey...</div>

  return (
    <div 
      className="survey-container"
      data-survey-id={surveyJson.id || 'default'}
    >
      {/* Theme Switcher Button */}
      <div className="theme-switcher-container">
        <button 
          className="theme-switcher-btn"
          onClick={() => setShowThemeSelector(!showThemeSelector)}
          title="Change survey theme"
        >
          🎨 Theme
        </button>
        
        {showThemeSelector && (
          <div className="theme-selector-dropdown">
            <div className="theme-selector-header">
              <h4>Select Survey Theme</h4>
              <button 
                className="close-btn"
                onClick={() => setShowThemeSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="theme-options">
              {AVAILABLE_THEMES.map((theme) => (
                <button
                  key={theme.value}
                  className={`theme-option ${currentTheme === theme.value ? 'active' : ''}`}
                  onClick={() => handleThemeChange(theme.value)}
                >
                  <span className="theme-name">{theme.name}</span>
                  {currentTheme === theme.value && <span className="checkmark">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Survey Component */}
      <Survey model={survey} />
    </div>
  )
}

export default SurveyRenderer