# Testing Typeahead Functionality

## Quick Start (No Backend Required!)

The typeahead testing setup uses a mock server that loads CSV data directly from the public folder. You don't need to set up any customer, namespace, or backend API.

### 1. Enable Mock Mode

Create or update your `.env` file:
```bash
VITE_USE_MOCK=true
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Access the Test Page

Navigate to: http://localhost:3000/typeahead-test

## What You'll See

The test page includes a travel survey with multiple typeahead-enabled dropdowns:

- **Countries**: 195 countries to search through
- **Cities**: 500+ cities worldwide (with country-based filtering)
- **Airlines**: 250+ airlines with codes
- **Airports**: 400+ airports with IATA codes

## How the Mock Server Works

1. **CSV Data Loading**: The mock server loads CSV files from `/public/typeahead-survey-data/`
2. **No Backend Required**: Everything runs client-side with the mock interceptor
3. **Search Simulation**: The mock server filters data based on search parameters
4. **Realistic Performance**: Simulates API calls with proper search and pagination

## Testing Tips

### Testing Typeahead Search:
- **Countries**: Type "uni" to find United States, United Kingdom, United Arab Emirates
- **Cities**: Type "new" to find New York, New Orleans, New Delhi, Newcastle
- **Airlines**: Type "american" or "AA" to find American Airlines
- **Airports**: Type "LAX" or "los angeles" to find Los Angeles International

### Testing Cascading Dropdowns:
1. Select "United States" as country
2. The cities dropdown will only show US cities
3. Try searching for "new" - you'll only see New York (not New Delhi)

### Testing Performance:
- The mock server limits results to 20 items by default
- Debouncing prevents excessive "API calls" while typing
- Minimum 2 characters required to trigger search

## File Structure

```
public/
└── typeahead-survey-data/
    ├── countries.csv    # 195 countries
    ├── cities.csv       # 500+ cities with country codes
    ├── airlines.csv     # 250+ airlines
    └── airports.csv     # 400+ airports

src/
├── mocks/
│   └── typeaheadMockServer.ts  # Mock server implementation
├── pages/
│   └── TypeaheadTestPage.tsx   # Test page component
└── components/
    └── Survey/
        ├── TypeaheadDropdownWidget.ts  # Custom widget
        └── typeahead-dropdown.css      # Styles
```

## Troubleshooting

### "Mock server disabled" message
- Make sure `VITE_USE_MOCK=true` is in your `.env` file
- Restart the dev server after changing `.env`

### No search results appearing
- Check browser console for errors
- Verify CSV files are in `/public/typeahead-survey-data/`
- Make sure you're typing at least 2 characters

### Typeahead not working on dropdowns
- The survey JSON must include `"enableTypeahead": true` on dropdown fields
- Check that the TypeaheadDropdownWidget is registered in SurveyRenderer

## How It Works Without a Backend

The mock server (`typeaheadMockServer.ts`) intercepts fetch requests and:
1. Loads CSV data from the public folder
2. Filters results based on search parameters
3. Returns formatted JSON responses
4. Simulates real API behavior

This approach means:
- ✅ No backend setup required
- ✅ No customer/namespace configuration
- ✅ Works immediately with `npm run dev`
- ✅ Perfect for testing and demos

## Customizing Test Data

To add more test data, simply edit the CSV files in `/public/typeahead-survey-data/`:
- Add more countries to `countries.csv`
- Add more cities to `cities.csv`
- The mock server automatically picks up changes (refresh the page)