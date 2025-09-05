# Typeahead Functionality for SurveyJS Dropdowns

## What's Been Added

### 1. Debounce Utility (`src/utils/debounce.ts`)

- Prevents excessive API calls while typing
- Configurable delay between keystrokes

### 2. Custom Typeahead Widget (`TypeaheadDropdownWidget.ts`)

- Custom SurveyJS widget that replaces standard dropdowns
- Features:
  - Real-time search as you type
  - Configurable minimum character length (default: 2)
  - Configurable debounce delay (default: 300ms)
  - Loading state indicator
  - No results message
  - Error handling

### 3. Survey Renderer Updates

- Integrated typeahead widget
- Added search parameter support to API calls
- Handles both old and new API structures

### 4. Styling (`typeahead-dropdown.css`)

- Clean, modern UI matching SurveyJS themes
- Dark theme support
- Focus states and hover effects
- Loading indicators

### 5. Mock Data Support

- Added test data for countries, cities, and employees
- Search filtering in mock server
- Parent-child relationship support for cascading dropdowns

## How to Use

In your survey JSON, add these properties to any dropdown field:

```json
{
  "type": "dropdown",
  "name": "country",
  "title": "Select a country",
  "enableTypeahead": true,              // Enable typeahead
  "typeaheadMinLength": 2,              // Min chars to trigger search
  "typeaheadDebounceMs": 300,           // Delay before API call
  "placeholder": "Start typing...",
  "choicesByUrl": {
    "url": "/your-api-endpoint",
    "valueName": "key",
    "titleName": "value"
  }
}
```

## Testing

1. Set `VITE_USE_MOCK=true` in your `.env` file
2. Use the `typeahead-test-survey.json` file I created
3. Try typing in the dropdowns:
   - Countries: Type "un" to see "United States", "United Kingdom"
   - Employees: Type "john" to filter employees
   - Cities: Select a country first, then cities are filtered

## API Integration

The implementation sends these query parameters:
- `search`: The search text entered
- `size`: Limit results (default: 20)
- `parent_key`: For cascading dropdowns

Your backend should filter results based on the `search` parameter and return matching items.

## Benefits

The typeahead feature significantly improves UX for large datasets by:
- Reducing initial load time (no need to load all options)
- Making it easier to find specific items
- Reducing network traffic with debouncing
- Providing instant feedback while typing