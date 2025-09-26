# Typeahead Deployment Checklist

## ✅ Frontend Preparation (COMPLETED)
- [x] Removed mock server test files
- [x] Cleaned up test-specific code in SurveyRenderer
- [x] Removed TypeaheadTestPage 
- [x] Created production survey JSON (`travel-survey-production.json`)
- [x] Verified widget registration

## 📤 Data Upload Tasks (FOR YOU TO DO)

### 1. Transform CSV Data
```bash
cd typeahead-survey-data
python3 transform_data.py
```
This creates:
- `countries_upload.csv`
- `cities_upload.csv`
- `airports_upload.csv`
- `airlines_upload.csv`

### 2. Upload to Backend
Upload each CSV file via the API:
```
POST /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/lookups/upload-csv

Parameters:
- lookup_name: 'countries' (or 'cities', 'airports', 'airlines')
- lookup_type: 'list'
- file: [corresponding *_upload.csv file]
```

### 3. Verify Lookups
Test that the lookups are working:
```bash
# Test countries
GET /api/v1/lookups/countries?search=united&size=20

# Test cities with parent filtering
GET /api/v1/lookups/cities?parent_key=us&search=new&size=20

# Test airports
GET /api/v1/lookups/airports?search=jfk&size=20

# Test airlines
GET /api/v1/lookups/airlines?search=delta&size=20
```

## 🚀 Production Files

### Core Widget Files (Keep These)
- `src/components/Survey/TypeaheadDropdownWidget.ts` - The typeahead widget implementation
- `src/components/Survey/typeahead-dropdown.css` - Widget styling
- `src/components/Survey/SurveyRenderer.tsx` - Updated with widget registration

### Survey Files
- `typeahead-survey-data/travel-survey-production.json` - Production-ready survey with proper API endpoints

### Test Files (Already Removed)
- ~~`src/mocks/typeaheadMockServer.ts`~~ - REMOVED
- ~~`src/pages/TypeaheadTestPage.tsx`~~ - REMOVED
- ~~`typeahead-survey-data/travel-survey-mock.json`~~ - Keep for reference only

## 🔍 API Endpoint Structure

The production endpoints follow this pattern:
```
/api/v1/lookups/{lookup_name}
```

With query parameters:
- `search`: Search text (for typeahead)
- `parent_key`: Parent filter (for cascading dropdowns)
- `size`: Result limit (default 20 for typeahead)

## 📝 Survey JSON Configuration

For any dropdown to use typeahead, add these properties:
```json
{
  "type": "dropdown",
  "name": "field_name",
  "enableTypeahead": true,
  "typeaheadMinLength": 2,
  "typeaheadDebounceMs": 300,
  "choicesByUrl": {
    "url": "/api/v1/lookups/lookup_name",
    "valueName": "key",
    "titleName": "text"
  }
}
```

For cascading dropdowns:
```json
{
  "url": "/api/v1/lookups/cities?parent_key={country_field}",
  "valueName": "key",
  "titleName": "text"
}
```

In dynamic panels, use `{panel.field_name}`:
```json
{
  "url": "/api/v1/lookups/cities?parent_key={panel.country}",
  "valueName": "key",
  "titleName": "text"
}
```

## ✨ Features Working in Production

1. **Typeahead Search**: Searches across all columns in the lookup data
2. **Debouncing**: 300ms default to reduce API calls
3. **Minimum Length**: Only searches after 2+ characters
4. **Cascading Dropdowns**: Child dropdowns filter based on parent selection
5. **Dynamic Panels**: Works in repeating panels with `{panel.field}` references
6. **Value Persistence**: Selected values are maintained during form navigation
7. **Validation**: Proper validation with required fields

## 🎉 Ready for Production!

The frontend is fully configured and ready. Just upload your lookup data to the backend and update your survey JSON to use the production endpoints.