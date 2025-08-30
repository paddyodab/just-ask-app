# Survey Platform Architecture & Implementation Guide

## Overview

This document outlines the architecture, implementation details, and deployment considerations for a dynamic survey platform using SurveyJS with backend-driven survey definitions and lookup data.

## Current Implementation

### Frontend Architecture

The frontend is a React TypeScript application that:
- **Dynamically loads survey definitions** from the backend
- **Renders surveys using SurveyJS** library
- **Supports cascading dropdowns** with dynamic data loading
- **Handles survey responses** submission to the backend

#### Key Components

1. **SurveyPage Component** (`src/pages/SurveyPage.tsx`)
   - Loads survey JSON from backend based on URL parameters
   - Manages survey state (loading, completed, error)
   - Handles response submission
   - Falls back to local survey if backend unavailable

2. **SurveyRenderer Component** (`src/components/Survey/SurveyRenderer.tsx`)
   - Wraps SurveyJS Model
   - Handles dynamic URL transformations for cascading dropdowns
   - Manages authentication headers (when needed)
   - Processes lookup data from backend

### URL-Driven Survey Selection

The platform supports multiple surveys through URL query parameters:

```
http://localhost:3000/?customer={customerHex}&namespace={namespace}&survey={surveyName}
```

Examples:
- Default: `http://localhost:3000/` 
- Simple version: `http://localhost:3000/?survey=simple`
- Different namespace: `http://localhost:3000/?namespace=august-2025-survey`
- Multi-tenant: `http://localhost:3000/?customer=abc123&namespace=health-survey`
- A/B Testing: `http://localhost:3000/?survey=v2`

### Backend API Structure

#### URL Pattern
```
/{customer_hex}/{namespace}/{resource}
```

Where:
- `customer_hex`: Hex representation of customer/tenant UUID
- `namespace`: Campaign or survey grouping (e.g., "restaurant-survey", "august-2025-survey")
- `resource`: Type of data (survey, lookups, responses)

#### Key Endpoints

1. **Survey Definition**
   ```
   GET /{customer_hex}/{namespace}/survey?survey_name={name}
   ```
   Returns the complete SurveyJS JSON configuration

2. **Lookup Data**
   ```
   GET /{customer_hex}/{namespace}/lookups/{lookup_key}
   ```
   Returns array of options for dropdowns/checkboxes

3. **Cascading Lookups**
   ```
   GET /{customer_hex}/{namespace}/lookups/restaurants?cuisine=italian
   ```
   Returns filtered data based on parent selection

4. **Survey Responses**
   ```
   POST /{customer_hex}/{namespace}/responses
   GET /{customer_hex}/{namespace}/responses?respondent_id={id}
   ```
   Submit and retrieve survey responses

## Survey Creation Workflow

### 1. Survey Designer Creates Survey

Using SurveyJS Survey Creator (visual editor), designers create surveys with:
- Multiple pages
- Various question types (dropdown, checkbox, rating, text)
- Conditional logic (`visibleIf`, `choicesVisibleIf`)
- Cascading dropdowns with dynamic lookups
- Validation rules

### 2. Survey JSON Structure

Example survey with cascading dropdowns:

```json
{
  "title": "Restaurant Preferences Survey",
  "pages": [
    {
      "elements": [
        {
          "type": "dropdown",
          "name": "favorite_cuisine",
          "title": "What's your favorite cuisine?",
          "choicesByUrl": {
            "url": "/{customer_hex}/{namespace}/lookups/cuisine-types",
            "valueName": "key",
            "titleName": "text"
          }
        },
        {
          "type": "checkbox",
          "name": "visited_restaurants",
          "title": "Which {favorite_cuisine} restaurants have you visited?",
          "visibleIf": "{favorite_cuisine} notempty",
          "choicesByUrl": {
            "url": "/{customer_hex}/{namespace}/lookups/restaurants?cuisine={favorite_cuisine}",
            "valueName": "key",
            "titleName": "text"
          }
        }
      ]
    }
  ]
}
```

### 3. Special Features Implemented

#### Cascading Dropdowns
- Child dropdowns load data based on parent selections
- URLs use placeholders like `{favorite_cuisine}` that get replaced with actual values
- Child fields automatically clear when parent changes

#### Mutually Exclusive "No Restrictions" Option
```json
{
  "type": "checkbox",
  "name": "dietary_restrictions",
  "choicesByUrl": {
    "url": "/{customer_hex}/{namespace}/lookups/dietary-restrictions"
  },
  "showNoneItem": true,
  "noneText": "No Restrictions"
}
```

## Publishing Workflow

### What "Publish" Means

Publishing transitions a survey from draft/testing state to live/production state. This ensures quality control and prevents broken surveys from being served to users.

### Publishing Process Steps

#### 1. Pre-Publish Validation
```python
def validate_survey_before_publish(survey_json):
    """Validate survey is ready for production"""
    checks = {
        "has_title": bool(survey_json.get("title")),
        "has_pages": len(survey_json.get("pages", [])) > 0,
        "all_required_have_questions": validate_required_fields(survey_json),
        "all_urls_valid": validate_lookup_urls(survey_json),
        "conditional_logic_valid": validate_conditions(survey_json),
        "has_completion_message": bool(survey_json.get("completedHtml"))
    }
    
    if not all(checks.values()):
        raise ValidationError(f"Survey failed validation: {checks}")
    
    return True
```

#### 2. Database State Management
```sql
-- Survey states table
CREATE TABLE survey_versions (
    id UUID PRIMARY KEY,
    customer_hex VARCHAR(32),
    namespace VARCHAR(255),
    survey_name VARCHAR(255),
    version INTEGER,
    survey_json JSONB,
    status ENUM('draft', 'testing', 'published', 'archived'),
    created_at TIMESTAMP,
    published_at TIMESTAMP,
    published_by UUID,
    UNIQUE(customer_hex, namespace, survey_name, version)
);

-- Publish action
UPDATE survey_versions 
SET 
    status = 'published',
    published_at = NOW(),
    published_by = :user_id
WHERE 
    customer_hex = :customer_hex
    AND namespace = :namespace
    AND survey_name = :survey_name
    AND version = :version;

-- Archive previous version
UPDATE survey_versions 
SET status = 'archived'
WHERE 
    customer_hex = :customer_hex
    AND namespace = :namespace
    AND survey_name = :survey_name
    AND status = 'published'
    AND version < :version;
```

#### 3. API Publishing Endpoint
```python
@app.put("/{customer_hex}/{namespace}/survey/{survey_name}/publish")
async def publish_survey(
    customer_hex: str,
    namespace: str,
    survey_name: str,
    version: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    # Validate user has permission
    if not user_can_publish(current_user, customer_hex, namespace):
        raise HTTPException(403, "Not authorized to publish")
    
    # Get the survey to publish
    survey = await get_survey_version(customer_hex, namespace, survey_name, version)
    
    # Validate it's ready
    validate_survey_before_publish(survey.survey_json)
    
    # Check for active responses on current published version
    active_responses = await count_active_sessions(customer_hex, namespace, survey_name)
    if active_responses > 0:
        # Maybe warn or schedule publish for later
        pass
    
    # Perform the publish
    await publish_survey_version(survey)
    
    # Clear caches
    await invalidate_survey_cache(customer_hex, namespace, survey_name)
    
    # Log the event
    await log_audit_event({
        "action": "survey_published",
        "customer": customer_hex,
        "namespace": namespace,
        "survey": survey_name,
        "version": survey.version,
        "user": current_user.id
    })
    
    # Generate URLs
    survey_url = generate_survey_url(customer_hex, namespace, survey_name)
    
    return {
        "success": True,
        "version": survey.version,
        "published_at": datetime.now(),
        "survey_url": survey_url,
        "short_url": await create_short_url(survey_url)
    }
```

### Publishing Workflow Considerations

#### Version Management
- Keep multiple versions of surveys
- Allow rollback to previous versions
- Track who published what and when
- Support A/B testing with concurrent versions

#### Access Control
```python
# Different access levels
PERMISSIONS = {
    "view_draft": ["editor", "admin", "viewer"],
    "edit_draft": ["editor", "admin"],
    "publish": ["admin"],
    "view_responses": ["admin", "analyst"],
    "export_responses": ["admin", "analyst"]
}
```

#### Deployment Stages
1. **Development**: Local testing with mock data
2. **Staging**: Test with real backend, limited access
3. **UAT**: User acceptance testing with stakeholders
4. **Production**: Live survey available to respondents

## Infrastructure & Networking Considerations

### Caching Strategy

#### 1. Survey Definition Caching
```python
# Cache survey definitions (long TTL - changes infrequently)
@cache(ttl=3600)  # 1 hour
async def get_published_survey(customer_hex, namespace, survey_name):
    return await db.get_published_survey(customer_hex, namespace, survey_name)
```

#### 2. Lookup Data Caching
```python
# Cache lookup data (medium TTL - might change daily)
@cache(ttl=300)  # 5 minutes
async def get_lookup_data(customer_hex, namespace, lookup_key, filters=None):
    return await db.get_lookup_data(customer_hex, namespace, lookup_key, filters)
```

#### 3. Cache Invalidation on Publish
```python
async def invalidate_survey_cache(customer_hex, namespace, survey_name):
    # Clear Redis/Memcached
    await cache.delete(f"survey:{customer_hex}:{namespace}:{survey_name}")
    
    # Clear CDN cache
    await cdn.purge([
        f"/{customer_hex}/{namespace}/survey",
        f"/{customer_hex}/{namespace}/lookups/*"
    ])
    
    # Warm cache with new version
    await get_published_survey(customer_hex, namespace, survey_name)
```

### CDN Configuration

```nginx
# CDN/Nginx configuration
location ~ ^/[a-f0-9]{32}/[\w-]+/survey$ {
    proxy_pass http://backend;
    proxy_cache survey_cache;
    proxy_cache_valid 200 1h;
    proxy_cache_key "$uri$is_args$args";
    add_header X-Cache-Status $upstream_cache_status;
}

location ~ ^/[a-f0-9]{32}/[\w-]+/lookups/ {
    proxy_pass http://backend;
    proxy_cache lookup_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$uri$is_args$args";
}
```

### Load Balancing & Scaling

```yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: survey-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: api
        image: survey-api:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Database Considerations

#### Read Replicas for Surveys
```python
# Use read replicas for survey/lookup fetching
@router.get("/{customer_hex}/{namespace}/survey")
async def get_survey(db: Database = Depends(get_read_replica)):
    # Reads go to replica
    return await db.get_survey(...)

@router.post("/{customer_hex}/{namespace}/responses")
async def submit_response(db: Database = Depends(get_primary_db)):
    # Writes go to primary
    return await db.save_response(...)
```

#### Response Data Partitioning
```sql
-- Partition responses by month for better performance
CREATE TABLE survey_responses (
    id UUID,
    customer_hex VARCHAR(32),
    namespace VARCHAR(255),
    survey_data JSONB,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE survey_responses_2025_01 
    PARTITION OF survey_responses
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Security Considerations

#### 1. Rate Limiting
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/{customer_hex}/{namespace}/responses")
@limiter.limit("10/minute")  # Prevent spam submissions
async def submit_response():
    pass
```

#### 2. Input Validation
```python
# Validate survey responses match expected schema
def validate_response(survey_json, response_data):
    expected_fields = extract_field_names(survey_json)
    response_fields = response_data.keys()
    
    # Check for unexpected fields (possible injection attempt)
    unexpected = set(response_fields) - set(expected_fields)
    if unexpected:
        raise ValidationError(f"Unexpected fields: {unexpected}")
```

#### 3. CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://survey.example.com",
        "https://admin.example.com"
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"]
)
```

## Multi-Tenant Architecture

### Tenant Isolation
```python
# Ensure queries are always scoped to tenant
class TenantScopedQuery:
    def __init__(self, customer_hex):
        self.customer_hex = customer_hex
    
    async def get_survey(self, namespace, survey_name):
        return await db.query(
            "SELECT * FROM surveys WHERE customer_hex = ? AND namespace = ? AND survey_name = ?",
            [self.customer_hex, namespace, survey_name]
        )
```

### Tenant-Specific Features
```json
{
  "tenant_config": {
    "customer_hex": "abc123",
    "features": {
      "max_surveys": 10,
      "max_responses_per_month": 10000,
      "custom_branding": true,
      "api_access": true,
      "export_formats": ["csv", "json", "excel"]
    },
    "branding": {
      "logo_url": "https://...",
      "primary_color": "#007bff",
      "font_family": "Inter"
    }
  }
}
```

## Monitoring & Analytics

### Key Metrics to Track

```python
# Prometheus metrics
survey_loads_total = Counter('survey_loads_total', 'Total survey loads', ['customer', 'namespace', 'survey'])
survey_completions_total = Counter('survey_completions_total', 'Total survey completions', ['customer', 'namespace', 'survey'])
survey_load_duration = Histogram('survey_load_duration_seconds', 'Survey load time')
lookup_api_duration = Histogram('lookup_api_duration_seconds', 'Lookup API response time', ['lookup_key'])
```

### Error Tracking
```python
# Sentry integration
import sentry_sdk

sentry_sdk.init(
    dsn="https://...",
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )
```

## Deployment Pipeline

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Survey Platform

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          npm test
          python -m pytest
      
  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          # Deploy API
          kubectl set image deployment/survey-api api=survey-api:${{ github.sha }} -n staging
          # Deploy Frontend
          aws s3 sync dist/ s3://survey-staging/ --delete
          aws cloudfront create-invalidation --distribution-id $STAGING_CF_ID --paths "/*"
  
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # Similar to staging but with production configs
```

## Future Enhancements

### 1. Real-time Collaboration
- Multiple editors working on same survey
- Live preview of changes
- Commenting system for review

### 2. Advanced Analytics
- Completion funnel analysis
- Drop-off points identification
- Response time analysis
- A/B test results comparison

### 3. Conditional Logic Builder
- Visual interface for complex conditions
- Rule validation and testing
- Branching path visualization

### 4. Response Validation Service
- Fraud detection
- Duplicate response detection
- Response quality scoring

### 5. Webhook Integration
```python
@app.post("/{customer_hex}/{namespace}/responses")
async def submit_response(response_data: dict):
    # Save response
    response_id = await save_response(response_data)
    
    # Trigger webhooks
    await trigger_webhooks({
        "event": "response.created",
        "customer": customer_hex,
        "namespace": namespace,
        "response_id": response_id,
        "data": response_data
    })
```

## Summary

This architecture provides:
1. **Flexibility**: Surveys defined in JSON, no code changes needed
2. **Multi-tenancy**: Complete isolation between customers
3. **Scalability**: CDN, caching, read replicas
4. **Version Control**: Draft/publish workflow with history
5. **Dynamic Data**: Cascading dropdowns with filtered lookups
6. **URL-Driven**: Different surveys via query parameters
7. **Security**: Input validation, rate limiting, CORS

The publishing workflow ensures quality control while the infrastructure considerations handle scale and performance. The platform can serve anything from simple feedback forms to complex multi-page surveys with conditional logic and dynamic data loading.