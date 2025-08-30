# URL Pathing Implementation Guide

## Overview
Transform the current lookup system to use a cleaner URL structure with tenant hex IDs and survey-specific namespaces, supporting both simple lists and key-value mappings with optional bidirectional lookups.

## URL Structure
```
https://justask.com/{tenant_hex}/{survey_slug}/{lookup_key}?{filters}
```

### Example URLs:
- List all market areas: `/a3f4b2c1d5e64f7a8b9c0d1e2f3a4b5c/survey-sept-2025-market-areas/market-areas`
- Get hospital for ZIP: `/a3f4b2c1d5e64f7a8b9c0d1e2f3a4b5c/survey-sept-2025-market-areas/zip-to-hospital?zip=30666`
- Reverse lookup (ZIPs for hospital): `/a3f4b2c1d5e64f7a8b9c0d1e2f3a4b5c/survey-sept-2025-market-areas/zip-to-hospital?hospital=hosp-001&reverse=true`

## Implementation Steps

### Phase 1: Backend Core Changes

#### 1.1 Update Database Models

**File**: `just-ask-api/app/models/survey.py` (NEW)
```python
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
from app.models.base import Base

class Survey(Base):
    __tablename__ = "surveys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)  # Human-readable name
    slug = Column(String, nullable=False)  # URL-safe slug (namespace)
    config = Column(JSONB, default={})  # Survey configuration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    __table_args__ = (
        Index('idx_tenant_slug', 'tenant_id', 'slug', unique=True),
        Index('idx_active_surveys', 'tenant_id', 'is_active'),
    )
```

**File**: `just-ask-api/app/models/lookup.py` (UPDATE)
```python
# Add survey_id field to Lookup model
class Lookup(Base):
    __tablename__ = "lookups"
    
    # ... existing fields ...
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.id"), nullable=True)
    lookup_type = Column(String, default="list")  # "list" or "key_value"
    bidirectional = Column(Boolean, default=False)  # Enable reverse lookups
    
    # Update indexes
    __table_args__ = (
        Index('idx_survey_lookup', 'survey_id', 'key'),
        Index('idx_tenant_namespace', 'tenant_id', 'namespace'),
        # ... existing indexes ...
    )
```

#### 1.2 Create Slugification Utility

**File**: `just-ask-api/app/utils/slugify.py` (NEW)
```python
import re
from typing import Optional

def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    # Convert to lowercase
    text = text.lower()
    # Replace spaces and special chars with hyphens
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    # Remove leading/trailing hyphens
    return text.strip('-')

def uuid_to_hex(uuid_str: str) -> str:
    """Convert UUID to hex string (remove hyphens)."""
    return uuid_str.replace('-', '')

def hex_to_uuid(hex_str: str) -> str:
    """Convert hex string back to UUID format."""
    if len(hex_str) != 32:
        raise ValueError("Invalid hex string length")
    return f"{hex_str[:8]}-{hex_str[8:12]}-{hex_str[12:16]}-{hex_str[16:20]}-{hex_str[20:]}"
```

#### 1.3 Update Lookup Service

**File**: `just-ask-api/app/services/lookup_service.py` (UPDATE)
```python
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID
from app.models import Lookup, Survey
from app.utils.slugify import uuid_to_hex, hex_to_uuid

class LookupService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_survey_lookups(
        self,
        tenant_hex: str,
        survey_slug: str,
        lookup_key: str,
        filters: Optional[Dict[str, str]] = None,
        reverse: bool = False
    ) -> List[Dict[str, Any]]:
        """Get lookups for a specific survey."""
        # Convert hex back to UUID
        tenant_id = UUID(hex_to_uuid(tenant_hex))
        
        # Find survey by slug
        survey = self.db.query(Survey).filter(
            Survey.tenant_id == tenant_id,
            Survey.slug == survey_slug,
            Survey.is_active == True
        ).first()
        
        if not survey:
            return []
        
        # Base query
        query = self.db.query(Lookup).filter(
            Lookup.survey_id == survey.id,
            Lookup.key == lookup_key,
            Lookup.deleted_at.is_(None)
        )
        
        # Handle reverse lookups for bidirectional data
        if reverse and filters:
            # For reverse lookup, search in value JSONB field
            for filter_key, filter_value in filters.items():
                query = query.filter(
                    Lookup.value['value'].astext == filter_value
                )
            results = query.all()
            # Return the keys that match the value
            return [{"value": r.parent_key or r.key, "text": r.key} for r in results]
        
        # Normal forward lookup
        if filters:
            for filter_key, filter_value in filters.items():
                if filter_key == 'parent_key':
                    query = query.filter(Lookup.parent_key == filter_value)
                else:
                    # Check in extra_data or parent_key
                    query = query.filter(
                        (Lookup.parent_key == filter_value) |
                        (Lookup.extra_data[filter_key].astext == filter_value)
                    )
        
        results = query.all()
        
        # Format response based on lookup type
        return self._format_lookup_response(results, lookup_key)
    
    def _format_lookup_response(self, lookups: List[Lookup], lookup_key: str) -> List[Dict]:
        """Format lookups based on their type."""
        if not lookups:
            return []
        
        # Detect if it's a key-value mapping or simple list
        first_lookup = lookups[0]
        lookup_type = first_lookup.lookup_type if hasattr(first_lookup, 'lookup_type') else 'list'
        
        if lookup_type == 'key_value':
            # Return as key-value pairs
            return [
                {
                    "key": lookup.key,
                    "value": lookup.value.get("value", lookup.key),
                    "text": lookup.value.get("text", "")
                }
                for lookup in lookups
            ]
        else:
            # Return as simple list (SurveyJS format)
            return [
                {
                    "value": lookup.value.get("value", lookup.key),
                    "text": lookup.value.get("text", lookup.value.get("value", lookup.key))
                }
                for lookup in lookups
            ]
    
    async def bulk_import_for_survey(
        self,
        tenant_id: UUID,
        survey_name: str,
        lookup_data: Dict[str, List[Dict]]
    ) -> Dict[str, Any]:
        """Import lookups for a new survey."""
        from app.utils.slugify import slugify
        
        # Create or get survey
        survey_slug = slugify(survey_name)
        survey = self.db.query(Survey).filter(
            Survey.tenant_id == tenant_id,
            Survey.slug == survey_slug
        ).first()
        
        if not survey:
            survey = Survey(
                tenant_id=tenant_id,
                name=survey_name,
                slug=survey_slug
            )
            self.db.add(survey)
            self.db.commit()
        
        imported_count = 0
        
        # Import each lookup set
        for lookup_key, items in lookup_data.items():
            # Detect lookup type
            lookup_type = self._detect_lookup_type(items)
            bidirectional = lookup_key.endswith('-bidirectional')
            
            for item in items:
                lookup = Lookup(
                    tenant_id=tenant_id,
                    survey_id=survey.id,
                    namespace=survey_slug,  # Keep for backward compatibility
                    key=lookup_key,
                    value=item,
                    lookup_type=lookup_type,
                    bidirectional=bidirectional
                )
                self.db.add(lookup)
                imported_count += 1
        
        self.db.commit()
        
        return {
            "survey_id": str(survey.id),
            "survey_slug": survey_slug,
            "imported_count": imported_count
        }
    
    def _detect_lookup_type(self, items: List[Dict]) -> str:
        """Detect if items are simple list or key-value mapping."""
        if not items:
            return "list"
        
        # Check if items have both key and value fields
        first_item = items[0]
        if "key" in first_item and "value" in first_item:
            return "key_value"
        return "list"
```

#### 1.4 Update API Routes

**File**: `just-ask-api/app/api/v1/lookups.py` (UPDATE)
```python
from app.utils.slugify import uuid_to_hex, hex_to_uuid, slugify

# Add new route for survey-based lookups
@router.get("/{tenant_hex}/{survey_slug}/{lookup_key}")
async def get_survey_lookup(
    tenant_hex: str,
    survey_slug: str,
    lookup_key: str,
    response: Response,
    reverse: bool = Query(False),
    db: Session = Depends(get_db),
    **kwargs  # Catch all query params as filters
):
    """
    Get lookups for a specific survey using clean URL structure.
    Supports both forward and reverse lookups.
    """
    # Extract query parameters as filters
    filters = {k: v for k, v in kwargs.items() if v is not None}
    
    service = LookupService(db)
    data = await service.get_survey_lookups(
        tenant_hex=tenant_hex,
        survey_slug=survey_slug,
        lookup_key=lookup_key,
        filters=filters,
        reverse=reverse
    )
    
    # Set cache headers
    cache_key = f"{tenant_hex}:{survey_slug}:{lookup_key}:{str(filters)}:{reverse}"
    etag = hashlib.md5(json.dumps(data).encode()).hexdigest()
    
    if request.headers.get("if-none-match") == etag:
        response.status_code = 304
        return []
    
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400"
    response.headers["ETag"] = etag
    
    return data

# Add survey creation endpoint
@router.post("/surveys")
async def create_survey(
    survey_name: str,
    tenant_id: UUID = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new survey with its namespace."""
    survey_slug = slugify(survey_name)
    
    # Check if survey already exists
    existing = db.query(Survey).filter(
        Survey.tenant_id == tenant_id,
        Survey.slug == survey_slug
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Survey already exists")
    
    survey = Survey(
        tenant_id=tenant_id,
        name=survey_name,
        slug=survey_slug
    )
    db.add(survey)
    db.commit()
    
    return {
        "survey_id": str(survey.id),
        "survey_slug": survey_slug,
        "tenant_hex": uuid_to_hex(str(tenant_id)),
        "base_url": f"/api/v1/lookups/{uuid_to_hex(str(tenant_id))}/{survey_slug}"
    }
```

### Phase 2: Frontend Updates

#### 2.1 Update API Client

**File**: `src/api/lookups.ts` (UPDATE)
```typescript
import { uuid_to_hex } from '../utils/uuid';

export interface LookupConfig {
  tenantId: string;
  surveySlug: string;
  lookupKey: string;
  filters?: Record<string, string>;
  reverse?: boolean;
}

export async function getSurveyLookup(config: LookupConfig): Promise<any[]> {
  const tenantHex = uuid_to_hex(config.tenantId);
  const params = new URLSearchParams();
  
  if (config.filters) {
    Object.entries(config.filters).forEach(([key, value]) => {
      params.append(key, value);
    });
  }
  
  if (config.reverse) {
    params.append('reverse', 'true');
  }
  
  const queryString = params.toString();
  const url = `/api/v1/lookups/${tenantHex}/${config.surveySlug}/${config.lookupKey}${
    queryString ? `?${queryString}` : ''
  }`;
  
  const response = await apiClient.get(url);
  return response.data;
}

export async function createSurvey(surveyName: string): Promise<any> {
  const response = await apiClient.post('/api/v1/lookups/surveys', null, {
    params: { survey_name: surveyName }
  });
  return response.data;
}
```

#### 2.2 Add UUID Utility

**File**: `src/utils/uuid.ts` (NEW)
```typescript
export function uuid_to_hex(uuid: string): string {
  return uuid.replace(/-/g, '');
}

export function hex_to_uuid(hex: string): string {
  if (hex.length !== 32) {
    throw new Error('Invalid hex string length');
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

#### 2.3 Update Dynamic Dropdown Component

**File**: `src/components/Survey/DynamicDropdown.tsx` (UPDATE)
```typescript
import { getSurveyLookup } from '../../api/lookups';
import { uuid_to_hex, slugify } from '../../utils/uuid';

// Update the dropdown to use new API structure
const DynamicDropdown: React.FC<Props> = ({ question, value, onChange, parentValues }) => {
  const [choices, setChoices] = useState<any[]>([]);
  
  useEffect(() => {
    const loadChoices = async () => {
      if (question.choicesUrl) {
        // Parse the URL to extract lookup configuration
        const urlParts = question.choicesUrl.split('/');
        const lookupKey = urlParts[urlParts.length - 1].split('?')[0];
        
        // Build filters from parent values
        const filters: Record<string, string> = {};
        if (parentValues) {
          Object.entries(parentValues).forEach(([key, val]) => {
            if (val) filters[key] = val as string;
          });
        }
        
        const surveySlug = slugify(question.surveyName || 'default-survey');
        
        const data = await getSurveyLookup({
          tenantId: import.meta.env.VITE_TENANT_ID,
          surveySlug,
          lookupKey,
          filters
        });
        
        setChoices(data);
      }
    };
    
    loadChoices();
  }, [question, parentValues]);
  
  // ... rest of component
};
```

### Phase 3: Data Migration

#### 3.1 Migration Script

**File**: `just-ask-api/scripts/migrate_to_survey_structure.py` (NEW)
```python
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Lookup, Survey, Tenant
from app.utils.slugify import slugify, uuid_to_hex
from app.config import settings
import pandas as pd

async def migrate_existing_data():
    """Migrate existing lookup data to new survey structure."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Get all unique namespace-tenant combinations
        namespaces = db.query(
            Lookup.tenant_id,
            Lookup.namespace
        ).distinct().all()
        
        for tenant_id, namespace in namespaces:
            # Create survey for each namespace
            survey_name = namespace.replace('-', ' ').title()
            survey_slug = slugify(namespace)
            
            survey = Survey(
                tenant_id=tenant_id,
                name=survey_name,
                slug=survey_slug
            )
            db.add(survey)
            db.flush()
            
            # Update lookups to reference the survey
            db.query(Lookup).filter(
                Lookup.tenant_id == tenant_id,
                Lookup.namespace == namespace
            ).update({
                'survey_id': survey.id
            })
            
            print(f"Migrated namespace '{namespace}' to survey '{survey_slug}'")
            print(f"  Tenant hex: {uuid_to_hex(str(tenant_id))}")
            print(f"  New URL pattern: /{uuid_to_hex(str(tenant_id))}/{survey_slug}/{{lookup_key}}")
        
        db.commit()
        print("Migration completed successfully")
        
    finally:
        db.close()

async def import_sample_data():
    """Import the sample data with new structure."""
    # Load sample data files
    data_files = {
        'zip-to-market': 'sample-data/ziptomarket.csv',
        'market-to-question': 'sample-data/markettoquestion.csv',
        'zip-to-fips': 'sample-data/ziptofips.csv',
        'hospital-list': 'sample-data/hospitallist.csv',
        'hospital-system-list': 'sample-data/hospitalsystemlist.csv'
    }
    
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Default tenant
        tenant_id = UUID('123e4567-e89b-12d3-a456-426614174000')
        
        # Create survey for September 2025 Market Areas
        survey = Survey(
            tenant_id=tenant_id,
            name="Survey for September 2025 Market Areas",
            slug="survey-sept-2025-market-areas"
        )
        db.add(survey)
        db.flush()
        
        for lookup_key, file_path in data_files.items():
            df = pd.read_csv(file_path)
            
            # Detect if it's key-value or list
            if len(df.columns) == 2:
                lookup_type = 'key_value'
                for _, row in df.iterrows():
                    lookup = Lookup(
                        tenant_id=tenant_id,
                        survey_id=survey.id,
                        namespace=survey.slug,
                        key=lookup_key,
                        value={
                            'key': str(row[0]),
                            'value': str(row[1])
                        },
                        lookup_type=lookup_type,
                        bidirectional=True  # Enable reverse lookups
                    )
                    db.add(lookup)
            else:
                lookup_type = 'list'
                for _, row in df.iterrows():
                    lookup = Lookup(
                        tenant_id=tenant_id,
                        survey_id=survey.id,
                        namespace=survey.slug,
                        key=lookup_key,
                        value={
                            'value': str(row[0]),
                            'text': str(row[1]) if len(df.columns) > 1 else str(row[0])
                        },
                        lookup_type=lookup_type
                    )
                    db.add(lookup)
            
            print(f"Imported {lookup_key}: {len(df)} records")
        
        db.commit()
        print(f"\nSurvey created successfully!")
        print(f"Tenant hex: {uuid_to_hex(str(tenant_id))}")
        print(f"Survey slug: {survey.slug}")
        print(f"Base URL: /{uuid_to_hex(str(tenant_id))}/{survey.slug}/")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(import_sample_data())
```

### Phase 4: Testing & Documentation

#### 4.1 Test Script

**File**: `just-ask-api/test_new_urls.py` (NEW)
```python
import requests
import json

# Configuration
TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"
TENANT_HEX = "123e4567e89b12d3a456426614174000"
SURVEY_SLUG = "survey-sept-2025-market-areas"
BASE_URL = "http://localhost:8001/api/v1/lookups"

def test_survey_lookups():
    """Test the new URL structure."""
    
    print("Testing new URL structure...")
    print("=" * 50)
    
    # Test 1: Get market areas (simple list)
    url = f"{BASE_URL}/{TENANT_HEX}/{SURVEY_SLUG}/market-areas"
    response = requests.get(url)
    print(f"\n1. Market Areas List")
    print(f"   URL: {url}")
    print(f"   Status: {response.status_code}")
    print(f"   Sample: {response.json()[:3] if response.ok else 'Error'}")
    
    # Test 2: Get hospitals for a ZIP (forward lookup)
    url = f"{BASE_URL}/{TENANT_HEX}/{SURVEY_SLUG}/zip-to-hospital?zip=30666"
    response = requests.get(url)
    print(f"\n2. Hospitals for ZIP 30666")
    print(f"   URL: {url}")
    print(f"   Status: {response.status_code}")
    print(f"   Result: {response.json() if response.ok else 'Error'}")
    
    # Test 3: Get ZIPs for a hospital (reverse lookup)
    url = f"{BASE_URL}/{TENANT_HEX}/{SURVEY_SLUG}/zip-to-hospital?hospital=hosp-001&reverse=true"
    response = requests.get(url)
    print(f"\n3. ZIPs for Hospital hosp-001 (reverse)")
    print(f"   URL: {url}")
    print(f"   Status: {response.status_code}")
    print(f"   Result: {response.json() if response.ok else 'Error'}")
    
    # Test 4: Get FIPS for ZIP
    url = f"{BASE_URL}/{TENANT_HEX}/{SURVEY_SLUG}/zip-to-fips?zip=35004"
    response = requests.get(url)
    print(f"\n4. FIPS code for ZIP 35004")
    print(f"   URL: {url}")
    print(f"   Status: {response.status_code}")
    print(f"   Result: {response.json() if response.ok else 'Error'}")
    
    print("\n" + "=" * 50)
    print("Testing complete!")

if __name__ == "__main__":
    test_survey_lookups()
```

#### 4.2 README Update

**File**: `just-ask-api/README_URL_STRUCTURE.md` (NEW)
```markdown
# URL Structure Documentation

## Overview
The JustAsk API uses a hierarchical URL structure that provides:
- Multi-tenancy support via tenant hex IDs
- Survey-specific namespaces for data isolation
- Support for both simple lists and key-value mappings
- Bidirectional lookup capabilities

## URL Pattern
```
/api/v1/lookups/{tenant_hex}/{survey_slug}/{lookup_key}?{filters}
```

### Components:
- **tenant_hex**: UUID with hyphens removed (32 character hex string)
- **survey_slug**: URL-safe version of survey name
- **lookup_key**: The specific lookup resource
- **filters**: Query parameters for filtering results

## Examples

### Simple List Lookup
```bash
GET /api/v1/lookups/123e4567e89b12d3a456426614174000/survey-sept-2025-market-areas/market-areas
```
Returns:
```json
[
  {"value": "10", "text": "Market Area 10"},
  {"value": "101", "text": "Market Area 101"}
]
```

### Key-Value Lookup (Forward)
```bash
GET /api/v1/lookups/123e4567e89b12d3a456426614174000/survey-sept-2025-market-areas/zip-to-hospital?zip=30666
```
Returns:
```json
[
  {"value": "hosp-001", "text": "General Hospital North"}
]
```

### Key-Value Lookup (Reverse)
```bash
GET /api/v1/lookups/123e4567e89b12d3a456426614174000/survey-sept-2025-market-areas/zip-to-hospital?hospital=hosp-001&reverse=true
```
Returns:
```json
[
  {"value": "30666", "text": "30666"},
  {"value": "30667", "text": "30667"}
]
```

## Creating a Survey

```bash
POST /api/v1/lookups/surveys
Headers: X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000
Body: { "survey_name": "Survey for September 2025 Market Areas" }
```
Returns:
```json
{
  "survey_id": "...",
  "survey_slug": "survey-sept-2025-market-areas",
  "tenant_hex": "123e4567e89b12d3a456426614174000",
  "base_url": "/api/v1/lookups/123e4567e89b12d3a456426614174000/survey-sept-2025-market-areas"
}
```

## Data Import

Bulk import for a survey:
```bash
POST /api/v1/lookups/bulk
Headers: X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000
Body: {
  "namespace": "survey-sept-2025-market-areas",
  "lookups": [
    {"key": "zip-to-hospital", "value": {"key": "30666", "value": "hosp-001"}},
    {"key": "zip-to-hospital", "value": {"key": "30667", "value": "hosp-001"}}
  ]
}
```

## Caching Strategy
- All lookups are cached with 1-hour TTL
- ETags are generated for client-side caching
- Cache is invalidated on updates
- CDN-friendly cache headers are set

## Security
- Tenant hex IDs provide obscurity (unguessable)
- Survey slugs are tenant-scoped
- No cross-tenant data access
- Optional: Add survey hex for additional security layer
```

## Summary

This implementation provides:

1. **Clean URLs**: Tenant hex + survey slug + lookup key structure
2. **Survey Isolation**: Each survey has its own namespace for lookups
3. **Flexible Lookups**: Support for both lists and key-value mappings
4. **Bidirectional Support**: Query in both directions with `?reverse=true`
5. **Backward Compatibility**: Existing namespace-based lookups continue to work
6. **Performance**: Built-in caching and ETag support
7. **Security**: Unguessable tenant hex IDs

The system allows survey configurators to:
- Create a survey with a meaningful name
- Upload their specific lookup data
- Access data via clean, predictable URLs
- Perform both forward and reverse lookups as needed

Next steps would be:
1. Run database migrations to add Survey table
2. Execute data migration script
3. Update frontend to use new URL structure
4. Test with sample data
5. Deploy changes