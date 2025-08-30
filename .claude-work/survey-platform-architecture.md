# Survey Platform Architecture: FastAPI Backend + React SurveyJS Frontend

## Overview
A multi-tenant SaaS survey platform using key-value storage for dynamic lookups, FastAPI for the backend API, and React with SurveyJS for the frontend.

## Core Architecture Principles

### 1. Key-Value Lookup System
Instead of rigid relational tables for lookup data, use PostgreSQL JSONB columns as a flexible KV store:

**Benefits:**
- Customer-specific lookups without schema migrations
- Dynamic creation/modification of lookup data
- Namespace-based organization
- Version control for lookups
- Efficient caching at edge locations

**Structure:**
```
lookups table:
- id (UUID)
- tenant_id (UUID)
- namespace (string): e.g., "survey-2024-q1", "market-areas"
- key (string): e.g., "hospital-123", "zipcode-10001"
- value (JSONB): SurveyJS-compatible choice format
- version (integer)
- created_at, updated_at
- metadata (JSONB): tags, descriptions, etc.
```

## Backend: FastAPI Implementation

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── tenant.py
│   │   ├── survey.py
│   │   └── lookup.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── survey.py
│   │   └── lookup.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── surveys.py
│   │   │   ├── lookups.py
│   │   │   └── responses.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── lookup_service.py
│   │   ├── survey_service.py
│   │   └── cache_service.py
│   └── middleware/
│       ├── __init__.py
│       ├── tenant.py
│       └── auth.py
├── migrations/
├── tests/
└── requirements.txt
```

### Key Components

#### 1. Database Models (SQLAlchemy + PostgreSQL)
```python
# models/lookup.py
class Lookup(Base):
    __tablename__ = "lookups"
    
    id = Column(UUID, primary_key=True)
    tenant_id = Column(UUID, ForeignKey("tenants.id"))
    namespace = Column(String, index=True)
    key = Column(String, index=True)
    value = Column(JSONB)  # SurveyJS choice format
    version = Column(Integer, default=1)
    metadata = Column(JSONB)
    
    __table_args__ = (
        Index('idx_tenant_namespace_key', 'tenant_id', 'namespace', 'key'),
    )
```

#### 2. API Endpoints
```python
# api/v1/lookups.py
@router.get("/lookups/{namespace}")
async def get_namespace_lookups(
    namespace: str,
    tenant_id: UUID = Depends(get_tenant_id),
    filters: Optional[Dict] = Query(None)
):
    """
    Returns lookups in SurveyJS choicesByUrl format:
    [{"value": "key", "text": "display_text"}, ...]
    """
    
@router.get("/lookups/{namespace}/{key}")
async def get_specific_lookup(
    namespace: str,
    key: str,
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get a specific lookup value"""

@router.post("/lookups/bulk")
async def query_lookups(
    query: LookupQuery,
    tenant_id: UUID = Depends(get_tenant_id)
):
    """
    Advanced querying for hierarchical/filtered lookups
    Supports pagination for large datasets
    """
```

#### 3. Caching Strategy (No Redis Required!)
```python
# services/cache_service.py
from functools import lru_cache
from datetime import datetime, timedelta
import hashlib

class InMemoryCacheService:
    """Simple in-memory cache that lives with the FastAPI process"""
    def __init__(self):
        self._cache = {}
        self._timestamps = {}
        
    async def get_or_set(self, key: str, fetch_func, ttl: int = 3600):
        now = datetime.now()
        
        # Check if cached and not expired
        if key in self._cache:
            if now - self._timestamps[key] < timedelta(seconds=ttl):
                return self._cache[key]
        
        # Fetch and cache
        data = await fetch_func()
        self._cache[key] = data
        self._timestamps[key] = now
        return data
    
    def invalidate(self, pattern: str = None):
        """Invalidate cache entries matching pattern"""
        if pattern:
            keys_to_delete = [k for k in self._cache if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
                del self._timestamps[key]
        else:
            self._cache.clear()
            self._timestamps.clear()

# Alternative: Use FastAPI's built-in caching with proper cache headers
from fastapi import Response

@router.get("/lookups/{namespace}")
async def get_namespace_lookups(
    namespace: str,
    response: Response,
    tenant_id: UUID = Depends(get_tenant_id),
):
    """
    Returns lookups with aggressive HTTP caching headers
    CDN will cache based on these headers
    """
    
    # Set cache headers for CDN
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400"
    response.headers["ETag"] = generate_etag(namespace, tenant_id)
    response.headers["Vary"] = "X-Tenant-ID"
    
    # Database query with built-in PostgreSQL caching
    # PostgreSQL automatically caches frequently accessed data in memory
    return await lookup_service.get_lookups(namespace, tenant_id)
```

#### 4. Handling Large Lists
```python
# services/lookup_service.py
class LookupService:
    async def get_paginated_lookups(
        self,
        namespace: str,
        tenant_id: UUID,
        page: int = 1,
        size: int = 100,
        search: Optional[str] = None
    ):
        """
        For large datasets, implement:
        - Pagination
        - Search/filtering
        - Virtual scrolling support
        """
        
    async def get_hierarchical_lookups(
        self,
        namespace: str,
        parent_key: Optional[str] = None
    ):
        """
        For hierarchical data (e.g., parent "10" → 200 children)
        Returns only the relevant subset
        """
```

## Frontend: React + SurveyJS

### Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Survey/
│   │   │   ├── SurveyRenderer.tsx
│   │   │   ├── SurveyBuilder.tsx
│   │   │   └── DynamicChoices.tsx
│   │   └── Lookups/
│   │       ├── LookupManager.tsx
│   │       └── LookupSearch.tsx
│   ├── hooks/
│   │   ├── useSurvey.ts
│   │   ├── useLookups.ts
│   │   └── useCache.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── surveyService.ts
│   │   └── lookupService.ts
│   ├── types/
│   │   ├── survey.ts
│   │   └── lookup.ts
│   └── utils/
│       ├── surveyHelpers.ts
│       └── cache.ts
├── package.json
└── tsconfig.json
```

### Key Components

#### 1. Survey Renderer with Dynamic Choices
```typescript
// components/Survey/SurveyRenderer.tsx
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';

export const SurveyRenderer: React.FC<{ surveyJson: any }> = ({ surveyJson }) => {
  const survey = new Model(surveyJson);
  
  // Intercept and enhance choicesByUrl configurations
  survey.onLoadChoicesFromServer.add((sender, options) => {
    // Add authentication headers
    options.setHeaders = { 
      'Authorization': `Bearer ${getAuthToken()}`,
      'X-Tenant-ID': getTenantId()
    };
    
    // Handle large lists with search
    if (options.question.getType() === 'dropdown' && 
        options.question.searchEnabled) {
      options.url += `?search=${options.searchText}`;
    }
  });
  
  return <Survey model={survey} />;
};
```

#### 2. Dynamic Choice Configuration
```typescript
// utils/surveyHelpers.ts
export function configureDynamicChoices(
  question: any,
  namespace: string,
  filters?: Record<string, any>
) {
  const baseUrl = `${API_BASE_URL}/api/v1/lookups/${namespace}`;
  
  question.choicesByUrl = {
    url: baseUrl,
    valueName: "value",
    titleName: "text",
    // For hierarchical data
    path: filters?.parentKey ? `?parent=${filters.parentKey}` : ""
  };
  
  // Enable search for large lists
  if (filters?.enableSearch) {
    question.searchEnabled = true;
    question.minSearchLength = 2;
  }
}
```

#### 3. Cascading Dropdowns for Hierarchical Data
```typescript
// Survey JSON with cascading dropdowns
const surveyJson = {
  elements: [{
    type: "dropdown",
    name: "market_area",
    title: "Select Market Area",
    choicesByUrl: {
      url: "/api/v1/lookups/market-areas"
    }
  }, {
    type: "dropdown",
    name: "zip_code",
    title: "Select ZIP Code",
    choicesByUrl: {
      // Uses placeholder to create dynamic URL
      url: "/api/v1/lookups/zip-codes?market={market_area}"
    },
    // Only show when market area is selected
    visibleIf: "{market_area} notempty"
  }]
};
```

#### 4. Caching Strategy (Frontend)
```typescript
// hooks/useCache.ts
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; staleWhileRevalidate?: boolean }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < (options?.ttl || 3600000)) {
        setData(data);
        setLoading(false);
        
        // Stale while revalidate
        if (options?.staleWhileRevalidate) {
          fetcher().then(fresh => {
            setData(fresh);
            localStorage.setItem(key, JSON.stringify({
              data: fresh,
              timestamp: Date.now()
            }));
          });
        }
        return;
      }
    }
    
    // Fetch fresh data
    fetcher().then(data => {
      setData(data);
      setLoading(false);
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    });
  }, [key]);
  
  return { data, loading };
}
```

#### 5. Lookup Manager Component
```typescript
// components/Lookups/LookupManager.tsx
export const LookupManager: React.FC = () => {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  
  return (
    <div>
      <NamespaceSelector 
        namespaces={namespaces}
        onSelect={setSelectedNamespace}
      />
      
      <LookupEditor 
        namespace={selectedNamespace}
        onSave={handleSave}
      />
      
      <BulkImport 
        namespace={selectedNamespace}
        onImport={handleBulkImport}
      />
    </div>
  );
};
```

## Implementation Roadmap

### Phase 1: Core Infrastructure
1. Set up PostgreSQL with JSONB support
2. Implement basic CRUD for lookups
3. Create tenant isolation middleware
4. Build basic survey renderer

### Phase 2: Dynamic Lookups
1. Implement choicesByUrl integration
2. Add HTTP caching headers for CDN
3. Handle large dataset pagination
4. Build cascading dropdown support

### Phase 3: Advanced Features
1. Lookup versioning and history
2. Bulk import/export tools
3. Search and filtering
4. Real-time lookup updates

### Phase 4: Performance & Scale
1. CDN configuration (Cloudflare/CloudFront)
2. Database query optimization
3. Horizontal scaling setup
4. Load testing and optimization

## Key Design Decisions

### Why PostgreSQL JSONB over pure KV stores?
- ACID compliance for critical data
- Rich querying capabilities with JSON
- Familiar SQL for complex operations
- Easy backup and migration
- Built-in caching (shared_buffers) - no Redis needed!

### Caching Without Redis
Instead of adding Redis infrastructure, we leverage:
- **CDN Layer**: HTTP cache headers for static lookups
- **PostgreSQL's Buffer Cache**: Frequently accessed data stays in memory
- **Application Memory**: Simple in-process caching for hot paths
- **Browser LocalStorage**: Client-side caching for unchanged lookups
- **ETag Headers**: Efficient cache validation

### Why namespace-based organization?
- Logical grouping of related lookups
- Easy permission management
- Efficient caching strategies
- Clear data boundaries

### Handling Large Hierarchical Data
For your "10" → 200 items, "110" → 500 items scenario:
1. **Lazy Loading**: Load parent items first, children on demand
2. **Virtual Scrolling**: For large lists in UI
3. **Search-First UX**: Encourage search over scrolling
4. **Smart Caching**: Cache frequently accessed combinations

## Security Considerations
- Row-level security via tenant_id
- API rate limiting
- Input validation for JSONB data
- Secure URL construction for choicesByUrl
- CORS configuration for API access

## Monitoring & Observability
- API endpoint metrics (latency, errors)
- Cache hit/miss ratios
- Database query performance
- Lookup usage analytics
- Survey completion rates