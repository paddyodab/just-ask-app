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
        <div class="typeahead-loading" style="display: none;">Loading...</div>
      </div>
      <select class="typeahead-select sv-dropdown" style="display: none;"></select>
      <div class="typeahead-results" style="display: none;"></div>
    </div>
  `,
  afterRender: function(question: any, el: HTMLElement) {
    const container = el.querySelector('.typeahead-dropdown-container') as HTMLElement
    const input = el.querySelector('.typeahead-input') as HTMLInputElement
    const select = el.querySelector('.typeahead-select') as HTMLSelectElement
    const results = el.querySelector('.typeahead-results') as HTMLElement
    const loading = el.querySelector('.typeahead-loading') as HTMLElement
    
    if (!container || !input || !select || !results || !loading) return
    
    let currentChoices: any[] = []
    let isLoading = false
    
    // Set initial value if exists
    if (question.value) {
      // Try to find the display text for the current value
      const currentChoice = question.choices?.find((c: any) => c.value === question.value)
      if (currentChoice) {
        input.value = currentChoice.text || currentChoice.value
      } else {
        input.value = question.value
      }
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
          const originalUrl = question.choicesByUrl.url
          
          // Add search parameter to URL
          const url = new URL(originalUrl, window.location.origin)
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
          
          // Restore original URL
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
        item.textContent = choice.text || choice.value
        item.dataset.value = choice.value
        
        // Highlight if it's the current value
        if (choice.value === question.value) {
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
      question.value = choice.value
      input.value = choice.text || choice.value
      results.style.display = 'none'
      
      // Clear search state
      currentChoices = []
    }
    
    // Input event handlers
    input.addEventListener('input', (e) => {
      const searchText = (e.target as HTMLInputElement).value
      
      if (searchText.length === 0) {
        question.value = null
        results.style.display = 'none'
        return
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
        const currentChoice = question.choices?.find((c: any) => c.value === question.value)
        if (currentChoice) {
          input.value = currentChoice.text || currentChoice.value
        } else if (question.value) {
          input.value = question.value
        } else {
          input.value = ''
        }
      }
    }
  }
}

// Register the widget
export function registerTypeaheadWidget() {
  CustomWidgetCollection.Instance.add(typeaheadDropdownWidget)
}