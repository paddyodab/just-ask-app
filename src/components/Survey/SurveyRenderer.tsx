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
import { getAuthToken, getTenantId } from '../../utils/auth'
import { assetLoader, type AssetConfig } from '../../utils/assetLoader'

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
    const model = new Model(surveyJson)
    
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