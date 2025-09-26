# Typeahead Production Implementation Plan

## Executive Summary
This document outlines the complete plan for implementing typeahead functionality in production for the Just Ask survey platform. We've successfully tested the typeahead widget with mock data, and now need to integrate it with the real backend API and production surveys.

## Current State
✅ **Completed:**
- Custom typeahead widget (`TypeaheadDropdownWidget.ts`) 
- Mock server for testing (`typeaheadMockServer.ts`)
- Panel reference support for dynamic panels
- CSS styling for typeahead dropdowns
- Test page demonstrating functionality

## Backend Requirements (just-ask-api)

### 1. API Endpoint Verification ✅
**Status: READY** - The backend already supports the required functionality!

The existing endpoint at `/{tenant_hex}/{namespace_slug}/lookups/{lookup_name}` already supports:
- `search` parameter for text filtering
- `parent_key` parameter for hierarchical relationships  
- `size` parameter for limiting results
- `page` parameter for pagination
- Dynamic filtering via query parameters

**No backend changes required for basic typeahead functionality!**

### 2. Optional Backend Enhancements
While not required, these could improve performance:

```python
# In app/api/tenant_router.py - consider adding:
# 1. Specific typeahead mode that returns lighter responses
if request.query_params.get('typeahead') == 'true':
    # Return only key, value, text fields (skip metadata)
    data = [
        {
            "key": lookup.key,
            "value": lookup.value.get("value", lookup.key),
            "text": lookup.value.get("text", lookup.key)
        }
        for lookup in lookups
    ]

# 2. Add response size validation
if size > 100 and 'typeahead' in request.query_params:
    size = 20  # Force reasonable limit for typeahead
```

## Frontend Requirements (just-ask-app)

### 1. Widget Registration in Production ⚠️
**File:** `src/main.tsx` or `src/App.tsx`

```typescript
import { registerTypeaheadWidget } from './components/Survey/TypeaheadDropdownWidget'

// Register the widget on app initialization
registerTypeaheadWidget()
```

### 2. Remove Mock Server from Production 🔧
**File:** `src/main.tsx`

```typescript
// Only enable mock server in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  const { setupTypeaheadMockServer } = await import('./mocks/typeaheadMockServer')
  await setupTypeaheadMockServer()
}
```

### 3. Update Survey Renderer for Production URLs 🔧
**File:** `src/components/Survey/SurveyRenderer.tsx`

The current implementation already handles this correctly:
```typescript
// Line 156-165 - Already implemented!
if (question.choicesByUrl?.url && question.choicesByUrl.url.startsWith('/')) {
  if (import.meta.env.VITE_USE_MOCK === 'true' && question.choicesByUrl.url.startsWith('/mock-api/')) {
    // Mock mode - keep URL as-is
  } else {
    // Production mode - prepend API URL
    question.choicesByUrl.url = `${apiUrl}${question.choicesByUrl.url}`
  }
}
```

### 4. Import Production CSS ⚠️
**File:** `src/main.tsx` or `src/App.tsx`

```typescript
import './components/Survey/typeahead-dropdown.css'
```

### 5. Update API Client for Typeahead Support ✅
**File:** `src/api/lookups.ts`

The existing implementation already supports search parameters:
```typescript
// Lines 16-20 - Already implemented!
if (query.search) params.append('search', query.search)
if (query.size) params.append('size', query.size.toString())
```

## Survey Configuration Requirements

### 1. Survey JSON Structure
To enable typeahead on a dropdown question, add these properties:

```json
{
  "type": "dropdown",
  "name": "country",
  "title": "Select your country",
  "enableTypeahead": true,
  "typeaheadMinLength": 2,
  "typeaheadDebounceMs": 300,
  "choicesByUrl": {
    "url": "/api/v1/lookups/countries",
    "valueName": "key",
    "titleName": "text"
  }
}
```

### 2. Cascading Dropdowns (Parent-Child)
For dependent dropdowns:

```json
{
  "type": "dropdown",
  "name": "city",
  "title": "Select your city",
  "enableTypeahead": true,
  "choicesByUrl": {
    "url": "/api/v1/lookups/cities?parent_key={country}",
    "valueName": "key",
    "titleName": "text"
  },
  "visibleIf": "{country} notempty"
}
```

### 3. Dynamic Panels Support
For dropdowns within dynamic panels:

```json
{
  "type": "paneldynamic",
  "name": "visited_countries",
  "templateElements": [
    {
      "type": "dropdown",
      "name": "country",
      "enableTypeahead": true,
      "choicesByUrl": {
        "url": "/api/v1/lookups/countries"
      }
    },
    {
      "type": "dropdown", 
      "name": "city",
      "enableTypeahead": true,
      "choicesByUrl": {
        "url": "/api/v1/lookups/cities?parent_key={panel.country}"
      }
    }
  ]
}
```

## Data Migration Requirements

### 1. Prepare Lookup Data
Ensure your lookup data in the database has the correct structure:

```sql
-- Example: Countries table
INSERT INTO namespace_lookups (namespace_id, lookup_name, key, value) VALUES
  (1, 'countries', 'US', '{"value": "United States", "text": "United States"}'),
  (1, 'countries', 'GB', '{"value": "United Kingdom", "text": "United Kingdom"}');

-- Example: Cities with parent relationship
INSERT INTO namespace_lookups (namespace_id, lookup_name, key, parent_key, value) VALUES
  (1, 'cities', 'NYC', 'US', '{"value": "New York", "text": "New York, United States"}'),
  (1, 'cities', 'LON', 'GB', '{"value": "London", "text": "London, United Kingdom"}');
```

### 2. Verify Indexing
Ensure database indexes exist for performance:

```sql
-- Check for existing indexes on lookup queries
CREATE INDEX IF NOT EXISTS idx_lookup_search 
  ON namespace_lookups(namespace_id, lookup_name, parent_key);

CREATE INDEX IF NOT EXISTS idx_lookup_text_search 
  ON namespace_lookups USING gin((value->>'text') gin_trgm_ops);
```

## Implementation Checklist

### Phase 1: Backend Verification (No changes needed!)
- [x] Verify `/lookups/{lookup_name}` endpoint supports search parameter
- [x] Verify parent_key filtering works
- [x] Verify size limiting works
- [ ] Test with production data volumes

### Phase 2: Frontend Integration
- [ ] Add widget registration to main.tsx
- [ ] Import typeahead CSS in main.tsx
- [ ] Conditionally load mock server (dev only)
- [ ] Test with real API endpoints
- [ ] Remove test page from production build

### Phase 3: Survey Configuration
- [ ] Update existing survey JSON files to add `enableTypeahead` 
- [ ] Configure appropriate `typeaheadMinLength` (recommend 2-3)
- [ ] Set `typeaheadDebounceMs` based on API response time (recommend 300-500ms)
- [ ] Test cascading dropdowns with parent references
- [ ] Test dynamic panels with panel references

### Phase 4: Performance Testing
- [ ] Load test with large datasets (1000+ items)
- [ ] Verify caching is working (browser and API)
- [ ] Check network requests are properly debounced
- [ ] Validate search filtering performance

### Phase 5: Production Deployment
- [ ] Deploy backend (no changes needed!)
- [ ] Deploy frontend with typeahead widget
- [ ] Update survey definitions in database
- [ ] Monitor for errors in production
- [ ] Gather user feedback

## Testing Strategy

### 1. Unit Tests
```typescript
// Test widget registration
describe('TypeaheadWidget', () => {
  it('should register with CustomWidgetCollection', () => {
    registerTypeaheadWidget()
    expect(CustomWidgetCollection.Instance.widgets).toContainEqual(
      expect.objectContaining({ name: 'typeahead-dropdown' })
    )
  })
})
```

### 2. Integration Tests
- Test with real API endpoints
- Test search functionality
- Test parent-child relationships
- Test panel references

### 3. E2E Tests
- Complete survey flow with typeahead
- Test keyboard navigation
- Test mobile responsiveness
- Test accessibility (ARIA labels)

## Rollback Plan

If issues arise in production:

1. **Quick disable:** Set `enableTypeahead: false` in survey JSON
2. **Widget fallback:** The regular dropdown will be used automatically
3. **Full rollback:** Revert frontend deployment

## Performance Considerations

1. **API Response Time:** 
   - Target: < 200ms for typeahead queries
   - Use database indexes and caching

2. **Frontend Debouncing:**
   - Default: 300ms
   - Adjust based on API response time

3. **Result Limiting:**
   - Default: 20 results
   - Configurable via size parameter

4. **Caching Strategy:**
   - Browser: localStorage with 1-hour TTL
   - API: Redis with 1-hour TTL
   - CDN: Cache-Control headers

## Security Considerations

1. **Input Sanitization:**
   - Search parameter is already sanitized in backend
   - SQL injection protected via ORM

2. **Rate Limiting:**
   - Consider adding rate limiting for typeahead endpoints
   - Suggested: 30 requests per minute per IP

3. **Data Access:**
   - Existing tenant isolation is maintained
   - No additional security concerns

## Monitoring and Metrics

Track these metrics post-deployment:

1. **Performance Metrics:**
   - Typeahead query response time
   - Number of typeahead searches per session
   - Cache hit rate

2. **User Metrics:**
   - Typeahead usage rate
   - Selection accuracy
   - Time to complete dropdowns

3. **Error Metrics:**
   - Failed typeahead queries
   - Timeout errors
   - Network failures

## Conclusion

The typeahead implementation is **production-ready** with minimal changes required:

✅ **Backend:** Already supports all required functionality  
⚠️ **Frontend:** Only needs widget registration and CSS import  
🔧 **Configuration:** Update survey JSON with typeahead properties  

The implementation is low-risk because:
- Falls back to regular dropdown if typeahead fails
- No breaking changes to existing functionality
- Already tested with mock data
- Backend requires no changes

**Estimated Implementation Time:** 2-4 hours for basic deployment