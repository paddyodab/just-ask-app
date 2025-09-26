# Quick Start: Enable Typeahead in Production

## 🚀 30-Minute Implementation Guide

### Step 1: Frontend Changes (5 minutes)

**File: `src/main.tsx`**
```typescript
// Add these imports at the top
import { registerTypeaheadWidget } from './components/Survey/TypeaheadDropdownWidget'
import './components/Survey/typeahead-dropdown.css'

// After other initialization code, add:
registerTypeaheadWidget()

// Make mock server dev-only (if not already):
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  const { setupTypeaheadMockServer } = await import('./mocks/typeaheadMockServer')
  await setupTypeaheadMockServer()
}
```

### Step 2: Test with Existing API (10 minutes)

Create a test survey JSON with typeahead enabled:

```json
{
  "pages": [{
    "elements": [{
      "type": "dropdown",
      "name": "test_lookup",
      "title": "Test Typeahead",
      "enableTypeahead": true,
      "typeaheadMinLength": 2,
      "typeaheadDebounceMs": 300,
      "choicesByUrl": {
        "url": "/api/v1/lookups/YOUR_LOOKUP_NAME",
        "valueName": "key",
        "titleName": "text"
      }
    }]
  }]
}
```

Replace `YOUR_LOOKUP_NAME` with an actual lookup in your database.

### Step 3: Deploy to Staging (10 minutes)

1. Build the frontend:
```bash
npm run build
```

2. Deploy to staging environment

3. Test with real data

### Step 4: Update Production Surveys (5 minutes)

For each dropdown that needs typeahead, add these properties:

```json
"enableTypeahead": true,
"typeaheadMinLength": 2,
"typeaheadDebounceMs": 300
```

## ✅ That's It!

The backend already supports everything needed. No backend changes required!

## 🔍 Verification Checklist

- [ ] Widget loads on survey page
- [ ] Typing triggers search after 2 characters
- [ ] Results appear in dropdown
- [ ] Clicking result sets value
- [ ] Form submission includes selected value
- [ ] Cascading dropdowns work (if applicable)

## 🚨 Troubleshooting

**Issue:** No results appearing  
**Fix:** Check browser console for API calls. Verify the lookup name exists in database.

**Issue:** Results appear but can't select  
**Fix:** Verify `valueName` and `titleName` match your API response structure.

**Issue:** Cascading dropdowns not filtering  
**Fix:** Check parent reference syntax: `{parent_field}` for regular, `{panel.field}` for panels.

## 📊 What Your API Should Return

The existing API already returns the correct format:
```json
[
  {
    "key": "US",
    "value": "United States", 
    "text": "United States"
  },
  {
    "key": "GB",
    "value": "United Kingdom",
    "text": "United Kingdom"
  }
]
```

## 🎯 Production Ready!

With these minimal changes, typeahead will be working in production. The implementation is:
- ✅ Non-breaking (falls back to regular dropdown)
- ✅ Performance optimized (debounced + cached)
- ✅ Accessible (keyboard navigation works)
- ✅ Mobile friendly (touch events supported)