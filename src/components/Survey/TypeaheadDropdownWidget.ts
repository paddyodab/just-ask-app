import { CustomWidgetCollection, Serializer } from 'survey-core'
import { debounce } from '../../utils/debounce'

// Add enableTypeahead property to dropdown questions
Serializer.addProperty('dropdown', {
  name: 'enableTypeahead:boolean',
  default: false,
  category: 'general',
  visibleIndex: 10
})

Serializer.addProperty('dropdown', {
  name: 'typeaheadMinLength:number',
  default: 2,
  category: 'general',
  visibleIndex: 11,
  dependsOn: 'enableTypeahead',
  visibleIf: (obj: any) => obj.enableTypeahead === true
})

Serializer.addProperty('dropdown', {
  name: 'typeaheadDebounceMs:number',
  default: 300,
  category: 'general',
  visibleIndex: 12,
  dependsOn: 'enableTypeahead',
  visibleIf: (obj: any) => obj.enableTypeahead === true
})

const typeaheadDropdownWidget = {
  name: 'typeahead-dropdown',
  isFit: function(question: any) {
    return question.getType() === 'dropdown' && question.enableTypeahead === true
  },
  isDefaultRender: false,
  htmlTemplate: `
    <div class="typeahead-dropdown-container">
      <div class="typeahead-input-wrapper">
        <input 
          type="text" 
          class="typeahead-input sv-dropdown__input"
          placeholder="Type to search..."
          autocomplete="off"
        />
        <input 
          type="hidden" 
          class="typeahead-value"
        />
        <div class="typeahead-loading" style="display: none;">Loading...</div>
      </div>
      <select class="typeahead-select sv-dropdown" style="display: none;"></select>
      <div class="typeahead-results" style="display: none;"></div>
    </div>
  `,
  afterRender: function(question: any, el: HTMLElement) {
    const container = el.querySelector('.typeahead-dropdown-container') as HTMLElement
    const input = el.querySelector('.typeahead-input') as HTMLInputElement
    const hiddenInput = el.querySelector('.typeahead-value') as HTMLInputElement
    const select = el.querySelector('.typeahead-select') as HTMLSelectElement
    const results = el.querySelector('.typeahead-results') as HTMLElement
    const loading = el.querySelector('.typeahead-loading') as HTMLElement
    
    if (!container || !input || !hiddenInput || !select || !results || !loading) return
    
    let currentChoices: any[] = []
    let isLoading = false
    let selectedValue: any = null
    let selectedText: string = ''
    
    // Set initial value if exists
    if (question.value) {
      // For choicesByUrl questions, we need to handle the value differently
      // The question.value contains the actual value (key), but we need to display text
      
      // Store value in hidden input
      hiddenInput.value = question.value
      
      // First, try to find in existing choices if they're loaded
      const currentChoice = question.choices?.find((c: any) => {
        // Check both value and key fields
        return c.value === question.value || c.key === question.value
      })
      
      if (currentChoice) {
        input.value = currentChoice.text || currentChoice.value
        selectedValue = question.value
        selectedText = input.value
      } else {
        // If choices aren't loaded yet, just display the value
        // This will be updated when choices load
        input.value = question.value
        selectedValue = question.value
        selectedText = question.value
      }
      
      console.log(`Initial value for ${question.name}:`, question.value, 'Display:', input.value)
    }
    
    // Set placeholder
    if (question.placeholder) {
      input.placeholder = question.placeholder
    }
    
    // Handle readonly state
    const updateReadOnly = () => {
      input.disabled = question.isReadOnly
      if (question.isReadOnly) {
        results.style.display = 'none'
      }
    }
    updateReadOnly()
    question.readOnlyChangedCallback = updateReadOnly
    
    // Create debounced search function
    const searchChoices = debounce(async (searchText: string) => {
      if (!question.choicesByUrl || searchText.length < (question.typeaheadMinLength || 2)) {
        results.style.display = 'none'
        return
      }
      
      isLoading = true
      loading.style.display = 'inline-block'
      results.style.display = 'none'
      
      try {
        // For SurveyJS, we need to manually trigger the choice loading
        // by setting the filter property and calling the load method
        const survey = question.survey
        if (survey) {
          // Store original URL
          let originalUrl = question.choicesByUrl.url
          
          // Replace placeholders with actual values
          const regex = /{([^}]+)}/g
          let processedUrl = originalUrl
          let match
          while ((match = regex.exec(originalUrl)) !== null) {
            const fieldName = match[1]
            let fieldValue = null
            
            // Handle panel references like {panel.country}
            if (fieldName.startsWith('panel.')) {
              const panelFieldName = fieldName.substring(6) // Remove 'panel.'
              
              // In SurveyJS dynamic panels, we need to access the parent panel's data
              // Try multiple approaches to get the panel value
              
              // Method 1: Check if question has a parent panel
              if (question.parent && question.parent.getType && question.parent.getType() === 'paneldynamic') {
                const panel = question.parent
                const panelData = panel.data || panel.getValue() || {}
                fieldValue = panelData[panelFieldName]
                
                // If fieldValue is an object, try to extract the actual value
                if (fieldValue && typeof fieldValue === 'object') {
                  fieldValue = fieldValue.value || fieldValue.key || fieldValue.id || fieldValue
                }
                
                console.log(`Panel method 1 for ${fieldName}: found panel data`, panelData, 'value:', fieldValue)
              }
              
              // Method 2: Check parentPanel property
              if (!fieldValue && question.parentPanel) {
                const panelData = question.parentPanel.data || question.parentPanel.getValue() || {}
                fieldValue = panelData[panelFieldName]
                console.log(`Panel method 2 for ${fieldName}: found parentPanel data`, panelData, 'value:', fieldValue)
              }
              
              // Method 3: Check if question has panel property
              if (!fieldValue && question.panel) {
                const panelData = question.panel.data || question.panel.getValue() || {}
                fieldValue = panelData[panelFieldName]
                console.log(`Panel method 3 for ${fieldName}: found panel data`, panelData, 'value:', fieldValue)
              }
              
              // Method 4: Look for the value in the current panel context by traversing up
              if (!fieldValue) {
                let current = question.parent
                while (current && !fieldValue) {
                  console.log(`Panel method 4 checking:`, current.name, current.data)
                  
                  if (current.data && current.data[panelFieldName]) {
                    fieldValue = current.data[panelFieldName]
                    // Extract value if it's an object
                    if (fieldValue && typeof fieldValue === 'object') {
                      fieldValue = fieldValue.value || fieldValue.key || fieldValue.id || fieldValue
                    }
                    console.log(`Panel method 4 for ${fieldName}: found in parent context`, fieldValue)
                    break
                  }
                  
                  if (current.getValue && typeof current.getValue === 'function') {
                    const panelValue = current.getValue(panelFieldName)
                    if (panelValue) {
                      fieldValue = panelValue
                      // Extract value if it's an object
                      if (fieldValue && typeof fieldValue === 'object') {
                        fieldValue = fieldValue.value || fieldValue.key || fieldValue.id || fieldValue
                      }
                      console.log(`Panel method 4b for ${fieldName}: found via getValue`, fieldValue)
                      break
                    }
                  }
                  
                  // Also check if current has a question with the field name
                  if (current.getQuestionByName && typeof current.getQuestionByName === 'function') {
                    const targetQuestion = current.getQuestionByName(panelFieldName)
                    if (targetQuestion && targetQuestion.value) {
                      fieldValue = targetQuestion.value
                      console.log(`Panel method 4c for ${fieldName}: found via getQuestionByName`, fieldValue)
                      break
                    }
                  }
                  
                  current = current.parent
                }
              }
              
              // Method 5: Try to get from survey data with panel index
              if (!fieldValue) {
                const surveyData = survey.data || {}
                // Look for visited_countries array and get the current panel index
                if (surveyData.visited_countries && Array.isArray(surveyData.visited_countries)) {
                  // Find which panel we're in by looking at the question name pattern
                  const panels = surveyData.visited_countries
                  for (let i = 0; i < panels.length; i++) {
                    if (panels[i] && panels[i][panelFieldName]) {
                      fieldValue = panels[i][panelFieldName]
                      console.log(`Panel method 5 for ${fieldName}: found in survey data panel ${i}`, fieldValue)
                      break
                    }
                  }
                }
              }
              
              // Final check: if fieldValue is still an object, extract the string value
              if (fieldValue && typeof fieldValue === 'object') {
                // First check if the object has a nested property matching the field name
                if (fieldValue[panelFieldName]) {
                  fieldValue = fieldValue[panelFieldName]
                  console.log(`Extracted nested ${panelFieldName} from object:`, fieldValue)
                } else {
                  // Otherwise try common property names
                  const extractedValue = fieldValue.value || fieldValue.key || fieldValue.id || fieldValue.code
                  if (extractedValue && extractedValue !== '[object Object]') {
                    fieldValue = extractedValue
                    console.log(`Extracted value from object for ${fieldName}:`, extractedValue)
                  } else {
                    console.error(`Could not extract value from object for ${fieldName}:`, fieldValue)
                    fieldValue = null // Set to null to prevent [object Object]
                  }
                }
              }
              
              console.log(`Final panel reference result for ${fieldName}:`, fieldValue)
            } else {
              // Regular field reference
              fieldValue = survey.getValue(fieldName)
            }
            
            if (fieldValue) {
              processedUrl = processedUrl.replace(`{${fieldName}}`, encodeURIComponent(fieldValue))
            }
          }
          
          // Add search parameter to URL
          const url = new URL(processedUrl, window.location.origin)
          url.searchParams.set('search', searchText)
          url.searchParams.set('size', '20')
          
          // Update the URL temporarily
          question.choicesByUrl.url = url.toString()
          
          // Force reload of choices
          await new Promise((resolve, reject) => {
            question.choicesByUrl.onLoad = (loadedChoices: any[]) => {
              currentChoices = loadedChoices
              resolve(loadedChoices)
            }
            question.choicesByUrl.onError = (error: any) => {
              reject(error)
            }
            question.choicesByUrl.run()
          })
          
          // Restore original URL (keep the template with placeholders)
          question.choicesByUrl.url = originalUrl
        }
        
        // Display results
        displayResults(currentChoices)
      } catch (error) {
        console.error('Error loading choices:', error)
        results.innerHTML = '<div class="typeahead-error">Error loading results</div>'
        results.style.display = 'block'
      } finally {
        isLoading = false
        loading.style.display = 'none'
      }
    }, question.typeaheadDebounceMs || 300)
    
    // Display results function
    const displayResults = (choices: any[]) => {
      if (!choices || choices.length === 0) {
        results.innerHTML = '<div class="typeahead-no-results">No results found</div>'
        results.style.display = 'block'
        return
      }
      
      results.innerHTML = ''
      choices.slice(0, 20).forEach((choice: any) => {
        const item = document.createElement('div')
        item.className = 'typeahead-result-item'
        // Display text should be choice.text or choice.value
        const displayText = choice.text || choice.value || choice.key
        item.textContent = displayText
        // Store both key and value in dataset for selection
        item.dataset.key = choice.key || choice.value
        item.dataset.value = choice.value || choice.key
        item.dataset.text = displayText
        
        // Highlight if it's the current value
        const actualValue = choice.key !== undefined ? choice.key : choice.value
        if (actualValue === question.value) {
          item.classList.add('selected')
        }
        
        // Handle click
        item.addEventListener('click', () => {
          selectChoice(choice)
        })
        
        results.appendChild(item)
      })
      
      results.style.display = 'block'
    }
    
    // Select a choice
    const selectChoice = (choice: any) => {
      // Use the key as the value (for SurveyJS valueName configuration)
      // If key exists, use it as the value, otherwise fall back to value
      const actualValue = choice.key !== undefined ? choice.key : choice.value
      const displayText = choice.text || choice.value || actualValue
      
      console.log(`Setting value for ${question.name}:`, actualValue, 'Display:', displayText)
      
      // Store the selected value and text
      selectedValue = actualValue
      selectedText = displayText
      hiddenInput.value = actualValue
      
      question.value = actualValue
      input.value = displayText
      results.style.display = 'none'
      
      // Trigger SurveyJS value change event
      if (question.survey) {
        question.survey.setValue(question.name, actualValue)
      }
      
      // Clear search state
      currentChoices = []
    }
    
    // Input event handlers
    input.addEventListener('input', (e) => {
      const searchText = (e.target as HTMLInputElement).value
      
      // If the text matches what was selected, don't clear the value
      if (searchText === selectedText && selectedValue) {
        results.style.display = 'none'
        return
      }
      
      if (searchText.length === 0) {
        // Clear the value when input is cleared
        question.value = null
        selectedValue = null
        selectedText = ''
        if (question.survey) {
          question.survey.setValue(question.name, null)
        }
        results.style.display = 'none'
        return
      }
      
      // Only clear the value if user is typing something different
      if (searchText !== selectedText) {
        selectedValue = null
        selectedText = ''
      }
      
      searchChoices(searchText)
    })
    
    input.addEventListener('focus', () => {
      if (currentChoices.length > 0) {
        results.style.display = 'block'
      } else if (input.value.length >= (question.typeaheadMinLength || 2)) {
        searchChoices(input.value)
      }
    })
    
    input.addEventListener('blur', (e) => {
      // Delay hiding to allow clicking on results
      setTimeout(() => {
        if (!results.contains(document.activeElement)) {
          results.style.display = 'none'
        }
      }, 200)
    })
    
    // Handle value changes from other sources
    question.valueChangedCallback = () => {
      if (!document.activeElement || document.activeElement !== input) {
        const currentChoice = question.choices?.find((c: any) => c.value === question.value || c.key === question.value)
        if (currentChoice) {
          input.value = currentChoice.text || currentChoice.value
          hiddenInput.value = question.value
          selectedValue = question.value
          selectedText = input.value
        } else if (question.value) {
          input.value = question.value
          hiddenInput.value = question.value
          selectedValue = question.value
          selectedText = question.value
        } else {
          input.value = ''
          hiddenInput.value = ''
          selectedValue = null
          selectedText = ''
        }
      }
    }
    
    // Ensure the value is always synced
    question.onPropertyChanged.add((sender: any, options: any) => {
      if (options.name === 'value') {
        if (hiddenInput.value !== options.newValue && options.newValue) {
          hiddenInput.value = options.newValue
        }
      }
    })
    
    // Override the validation to accept the selected value
    const originalIsValueEmpty = question.isValueEmpty
    question.isValueEmpty = function(value: any) {
      // If we have a selected value in our widget, it's not empty
      if (selectedValue && (value === selectedValue || hiddenInput.value === selectedValue)) {
        return false
      }
      return originalIsValueEmpty.call(this, value)
    }
    
    // Override hasErrors to prevent clearing of valid typeahead values
    const originalHasErrors = question.hasErrors
    question.hasErrors = function(fireCallback: boolean = true, rec: any = null) {
      // If we have a selected value, ignore choice validation errors
      if (selectedValue && question.value === selectedValue) {
        // Still run other validations but ignore choice-specific ones
        const errors = this.getAllErrors()
        const filteredErrors = errors.filter((error: any) => 
          !error.getText().includes('Please select a value') && 
          !error.getText().includes('not in the list')
        )
        return filteredErrors.length > 0
      }
      return originalHasErrors.call(this, fireCallback, rec)
    }
  }
}

// Register the widget
export function registerTypeaheadWidget() {
  console.log('Registering typeahead widget...')
  console.log('CustomWidgetCollection.Instance:', CustomWidgetCollection.Instance)
  CustomWidgetCollection.Instance.add(typeaheadDropdownWidget)
  console.log('Widget registered:', typeaheadDropdownWidget.name)
  console.log('Total widgets:', CustomWidgetCollection.Instance.widgets.length)
  
  // Also expose for debugging
  if (typeof window !== 'undefined') {
    (window as any).typeaheadWidget = typeaheadDropdownWidget;
    (window as any).CustomWidgetCollection = CustomWidgetCollection;
  }
}