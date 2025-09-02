/**
 * Asset Loader Utility
 * Handles dynamic loading of CSS and other assets for surveys
 */

interface AssetConfig {
  stylesheets?: string[]
  logo?: string
  theme?: string
  primaryColor?: string
  secondaryColor?: string
  customVariables?: Record<string, string>
}

class AssetLoader {
  private loadedStylesheets: Set<string> = new Set()
  private styleElements: Map<string, HTMLStyleElement> = new Map()

  /**
   * Load CSS stylesheet dynamically
   */
  async loadStylesheet(url: string, surveyId?: string): Promise<void> {
    // Create unique ID for this stylesheet
    const id = surveyId ? `survey-css-${surveyId}-${url}` : `survey-css-${url}`
    
    // Check if already loaded
    if (this.loadedStylesheets.has(id)) {
      console.log(`Stylesheet already loaded: ${url}`)
      return
    }

    try {
      // Fetch the CSS content
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/css'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load stylesheet: ${response.statusText}`)
      }

      const cssContent = await response.text()
      
      // Create style element
      const styleElement = document.createElement('style')
      styleElement.id = id
      styleElement.setAttribute('data-survey-asset', surveyId || 'global')
      styleElement.textContent = cssContent
      
      // Add to document head
      document.head.appendChild(styleElement)
      
      // Track loaded stylesheet
      this.loadedStylesheets.add(id)
      this.styleElements.set(id, styleElement)
      
      console.log(`Loaded stylesheet: ${url}`)
    } catch (error) {
      console.error(`Error loading stylesheet ${url}:`, error)
      throw error
    }
  }

  /**
   * Load multiple stylesheets
   */
  async loadStylesheets(urls: string[], surveyId?: string): Promise<void> {
    const promises = urls.map(url => this.loadStylesheet(url, surveyId))
    await Promise.all(promises)
  }

  /**
   * Inject inline CSS variables for theming
   */
  injectCSSVariables(variables: Record<string, string>, surveyId?: string): void {
    const id = surveyId ? `survey-vars-${surveyId}` : 'survey-vars-global'
    
    // Remove existing variables if any
    const existing = document.getElementById(id)
    if (existing) {
      existing.remove()
    }

    // Create CSS variable string
    const cssVars = Object.entries(variables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n  ')

    // Create style element with CSS variables
    const styleElement = document.createElement('style')
    styleElement.id = id
    styleElement.setAttribute('data-survey-asset', surveyId || 'global')
    styleElement.textContent = `
      .survey-container[data-survey-id="${surveyId}"] {
        ${cssVars}
      }
      
      /* Also apply to SurveyJS root if no container */
      .sd-root-modern {
        ${cssVars}
      }
    `
    
    document.head.appendChild(styleElement)
    this.styleElements.set(id, styleElement)
  }

  /**
   * Build CSS variables from asset config
   */
  buildCSSVariables(config: AssetConfig): Record<string, string> {
    const variables: Record<string, string> = {}

    if (config.primaryColor) {
      variables['--sjs-primary-backcolor'] = config.primaryColor
      variables['--sjs-primary-backcolor-light'] = this.lightenColor(config.primaryColor, 20)
      variables['--sjs-primary-backcolor-dark'] = this.darkenColor(config.primaryColor, 20)
    }

    if (config.secondaryColor) {
      variables['--sjs-secondary-backcolor'] = config.secondaryColor
      variables['--sjs-secondary-backcolor-light'] = this.lightenColor(config.secondaryColor, 10)
    }

    // Merge with any custom variables
    if (config.customVariables) {
      Object.assign(variables, config.customVariables)
    }

    return variables
  }

  /**
   * Clean up assets for a specific survey
   */
  cleanup(surveyId: string): void {
    // Remove all style elements for this survey
    this.styleElements.forEach((element, id) => {
      if (element.getAttribute('data-survey-asset') === surveyId) {
        element.remove()
        this.styleElements.delete(id)
        this.loadedStylesheets.delete(id)
      }
    })
  }

  /**
   * Clean up all loaded assets
   */
  cleanupAll(): void {
    this.styleElements.forEach(element => element.remove())
    this.styleElements.clear()
    this.loadedStylesheets.clear()
  }

  /**
   * Helper to lighten a color
   */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1).toUpperCase()
  }

  /**
   * Helper to darken a color
   */
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) - amt
    const G = (num >> 8 & 0x00FF) - amt
    const B = (num & 0x0000FF) - amt
    return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
      (G > 0 ? G : 0) * 0x100 +
      (B > 0 ? B : 0))
      .toString(16).slice(1).toUpperCase()
  }

  /**
   * Process logo URL with tenant/namespace replacement
   */
  processAssetUrl(url: string, tenantId: string, namespace: string): string {
    return url
      .replace('{tenant_id}', tenantId)
      .replace('{namespace}', namespace)
      .replace('{namespace_slug}', namespace)
  }
}

// Export singleton instance
export const assetLoader = new AssetLoader()
export type { AssetConfig }