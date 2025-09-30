# Typeahead Migration Plan - Modern SurveyJS Approach

**Date**: 2025-09-30
**Goal**: Migrate from custom widget (v1.9.131) to native lazy loading (v2.3.3)

## Background

We previously attempted to use custom widgets from v1.9.131, but SurveyJS drastically changed their approach in v2.x. The modern approach uses **built-in lazy loading** instead of custom widgets, which is simpler and better maintained.

## Key Insight

**No Custom Widgets Needed!** 🎉

SurveyJS v2.x has native `choicesLazyLoadEnabled` that provides typeahead/autocomplete functionality automatically.

## How Modern Lazy Loading Works

### 1. Enable Lazy Loading on Questions
Set `choicesLazyLoadEnabled: true` on dropdown questions in survey JSON. This automatically adds a search box to the dropdown.

### 2. Handle Two Events

**`onChoicesLazyLoad`** - Fires when user types or scrolls
- Receives `options.filter` (search text)
- Receives `options.skip` and `options.take` (pagination)
- Call `options.setItems(items, totalCount)` with results

**`onGetChoiceDisplayValue`** - Loads display text for pre-selected values
- Receives `options.values` (array of selected keys)
- Call `options.setItems(displayNames)` with text array

### 3. API Integration Pattern

```typescript
survey.onChoicesLazyLoad.add((_, options) => {
  let url = `${API_BASE_URL}/api/customers/${customerId}/surveys/${surveyId}/lookups/${options.question.name}`;
  url += `?skip=${options.skip}&take=${options.take}`;

  if (options.filter) {
    url += `&search=${encodeURIComponent(options.filter)}`;
  }

  // For cascading dropdowns (e.g., cities filtered by country)
  if (options.question.name === 'city') {
    const country = survey.getValue('country');
    if (country) {
      url += `&parent_key=${encodeURIComponent(country)}`;
    }
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      options.setItems(data.results, data.total);
    });
});
```

## Implementation Steps

### Step 1: Upgrade Packages ✅

Remove old v1.9.131 versions:
```bash
npm uninstall survey-core survey-react-ui
```

Install modern v2.3.3:
```bash
npm install survey-core@^2.3.3 survey-react-ui@^2.3.3
```

### Step 2: Delete Custom Widget Code ✅

Remove these files (no longer needed):
- `src/features/survey/widgets/TypeaheadDropdownWidget.ts`
- `src/features/survey/widgets/typeahead-dropdown.css`

### Step 3: Update Survey JSON ✅

Modify `src/data/travelSurvey.json`:

**Before:**
```json
{
  "type": "dropdown",
  "name": "country",
  "choicesByUrl": {
    "url": "/api/customers/.../lookups/countries",
    "valueName": "key",
    "titleName": "text"
  }
}
```

**After:**
```json
{
  "type": "dropdown",
  "name": "country",
  "choicesLazyLoadEnabled": true,
  "choicesLazyLoadPageSize": 25,
  "placeholder": "Type to search countries..."
}
```

**Note**: Remove `choicesByUrl` - it's incompatible with lazy loading. We'll fetch via events instead.

### Step 4: Update CSS Imports ✅

In `src/features/survey/pages/TypeaheadTestPage.tsx` and `src/features/survey/components/Survey.tsx`:

**Change from:**
```typescript
import 'survey-core/defaultV2.min.css'
```

**Change to:**
```typescript
import 'survey-core/defaultV2.css'
```

(v2.3.3 uses different CSS file naming)

### Step 5: Implement Event Handlers ✅

In `src/features/survey/pages/TypeaheadTestPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/defaultV2.css'
import travelSurveyData from '../../../data/travelSurvey.json'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const CUSTOMER_ID = '30f8f53cf8034393b00665f664a60ddb'
const SURVEY_ID = 'typeahead-demo'

export const TypeaheadTestPage: React.FC = () => {
  const [survey] = useState(() => {
    const surveyModel = new Model(travelSurveyData)

    // Handle lazy loading of choices
    surveyModel.onChoicesLazyLoad.add((_, options) => {
      if (options.question.getType() !== 'dropdown') return

      let url = `${API_BASE_URL}/api/customers/${CUSTOMER_ID}/surveys/${SURVEY_ID}/lookups/${options.question.name}`
      url += `?skip=${options.skip}&take=${options.take}`

      // Add search filter
      if (options.filter) {
        url += `&search=${encodeURIComponent(options.filter)}`
      }

      // Handle cascading dropdowns (e.g., cities by country)
      if (options.question.name === 'city') {
        const country = surveyModel.getValue('country')
        if (country) {
          url += `&parent_key=${encodeURIComponent(country)}`
        }
      }

      console.log('Fetching choices:', url)

      fetch(url)
        .then(res => res.json())
        .then(data => {
          // Assuming API returns: { results: [{key, text}], total: number }
          options.setItems(
            data.results || data,
            data.total || data.length
          )
        })
        .catch(err => {
          console.error('Error loading choices:', err)
          options.setItems([], 0)
        })
    })

    // Handle display of pre-selected values
    surveyModel.onGetChoiceDisplayValue.add((_, options) => {
      if (options.question.getType() !== 'dropdown') return

      const valuesStr = options.values.map(v => `keys=${v}`).join('&')
      const url = `${API_BASE_URL}/api/customers/${CUSTOMER_ID}/surveys/${SURVEY_ID}/lookups/${options.question.name}/names?${valuesStr}`

      fetch(url)
        .then(res => res.json())
        .then(data => {
          // Assuming API returns: { names: ["United States", "United Kingdom"] }
          options.setItems(data.names || data)
        })
        .catch(err => {
          console.error('Error loading choice names:', err)
          options.setItems(options.values) // Fallback to showing keys
        })
    })

    return surveyModel
  })

  return (
    <div>
      <h1>Typeahead Testing Page</h1>
      <Survey model={survey} />
    </div>
  )
}
```

### Step 6: Update survey-fielding-api Endpoints ✅

The API needs to support:

**1. Search/Filter Parameter**
```python
@router.get("/api/customers/{customer_id}/surveys/{survey_id}/lookups/{lookup_name}")
async def get_lookup_values(
    customer_id: str,
    survey_id: str,
    lookup_name: str,
    skip: int = 0,
    take: int = 25,
    search: Optional[str] = None,  # NEW: Search filter
    parent_key: Optional[str] = None
):
    # Filter results by search term (case-insensitive)
    if search:
        results = [r for r in results if search.lower() in r['text'].lower()]

    # Apply pagination
    total = len(results)
    paginated = results[skip:skip + take]

    return {
        "results": paginated,
        "total": total
    }
```

**2. Get Display Names Endpoint** (NEW)
```python
@router.get("/api/customers/{customer_id}/surveys/{survey_id}/lookups/{lookup_name}/names")
async def get_lookup_display_names(
    customer_id: str,
    survey_id: str,
    lookup_name: str,
    keys: List[str] = Query(...)
):
    # Look up display names for given keys
    names = []
    for key in keys:
        record = db.query(Lookup).filter_by(key=key).first()
        if record:
            names.append(record.text)
        else:
            names.append(key)  # Fallback

    return {"names": names}
```

### Step 7: Test the Implementation ✅

1. Start survey-fielding-api: `uvicorn app.main:app --reload --port 8000`
2. Start survey-fielding-web: `npm run dev`
3. Navigate to `http://localhost:3002/test/typeahead`
4. Test scenarios:
   - Type in country field: "united" → should show United States, United Kingdom, etc.
   - Select a country → cities dropdown should filter to that country
   - Scroll dropdown → should load more results (pagination)
   - Pre-selected values → should display text, not keys

## Benefits of Modern Approach

✅ **No custom widget complexity** - Use built-in SurveyJS features
✅ **React 19 compatible** - Works with modern React versions
✅ **Built-in search UI** - Professional search box automatically added
✅ **Pagination support** - Handles large datasets efficiently
✅ **Maintained by SurveyJS** - No need to keep custom code updated
✅ **Much simpler code** - ~50 lines vs ~300+ lines of custom widget
✅ **Better performance** - Only loads visible items

## API Response Format

### Lazy Load Response
```json
{
  "results": [
    {"key": "us", "text": "United States"},
    {"key": "uk", "text": "United Kingdom"},
    {"key": "ae", "text": "United Arab Emirates"}
  ],
  "total": 197
}
```

### Display Names Response
```json
{
  "names": ["United States", "Canada", "Mexico"]
}
```

## Troubleshooting

### Issue: Search not working
- Check that API endpoint accepts `search` parameter
- Verify search is case-insensitive
- Check browser console for API errors

### Issue: Dropdown shows keys instead of text
- Implement `onGetChoiceDisplayValue` handler
- Verify `/names` endpoint is working
- Check response format matches expected structure

### Issue: Cascading dropdowns not filtering
- Verify `parent_key` is being passed correctly
- Check dependent question has correct parent reference
- Test parent value is available when child loads

## References

- [SurveyJS Lazy Loading Example](https://surveyjs.io/form-library/examples/lazy-loading-dropdown/reactjs)
- [onChoicesLazyLoad API](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#onChoicesLazyLoad)
- [SurveyJS v2 Migration Guide](https://surveyjs.io/stay-updated/migration-guides)

## Rollback Plan

If migration fails:
```bash
npm uninstall survey-core survey-react-ui
npm install survey-core@^1.9.131 survey-react-ui@^1.9.131 --legacy-peer-deps
```

Restore custom widget files from git history.