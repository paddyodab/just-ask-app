# Project Setup Guide for Sonnet Agents

## Overview
Two separate repositories for a multi-tenant survey platform with dynamic lookups using PostgreSQL JSONB storage, FastAPI backend, and React/SurveyJS frontend.

## Repository 1: Backend (`survey-platform-backend`)

### Initial Setup Commands
```bash
# Create repo and initial structure
mkdir survey-platform-backend
cd survey-platform-backend
git init

# Create Python environment
python -m venv venv
source venv/bin/activate

# Create project structure
mkdir -p app/{api/v1,models,schemas,services,middleware,utils}
mkdir -p scripts/importers
mkdir -p tests/{unit,integration}
mkdir -p migrations/versions

# Initialize as Python package
touch app/__init__.py app/api/__init__.py app/models/__init__.py
touch app/schemas/__init__.py app/services/__init__.py
```

### File Structure
```
survey-platform-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py                # Settings and environment vars
│   ├── database.py              # Database connection setup
│   ├── dependencies.py          # Shared dependencies (auth, db session)
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── lookups.py      # Lookup CRUD endpoints
│   │       ├── surveys.py      # Survey management
│   │       ├── imports.py      # Data import endpoints
│   │       └── health.py       # Health check endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py            # SQLAlchemy base
│   │   ├── tenant.py          # Tenant model
│   │   ├── lookup.py          # Lookup model (JSONB)
│   │   └── survey.py          # Survey model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── lookup.py          # Pydantic schemas for lookups
│   │   ├── survey.py          # Survey schemas
│   │   └── imports.py         # Import job schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── lookup_service.py  # Business logic for lookups
│   │   ├── import_service.py  # Import processing logic
│   │   └── cache_service.py   # In-memory caching
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── tenant.py          # Tenant isolation middleware
│   │   └── cors.py            # CORS configuration
│   └── utils/
│       ├── __init__.py
│       └── importers/         # Data importers
│           ├── __init__.py
│           ├── base.py        # Base importer class
│           ├── csv_importer.py
│           └── bulk_importer.py
├── scripts/
│   ├── importers/             # Standalone import scripts
│   │   ├── import_hospital_data.py
│   │   └── import_zip_data.py
│   └── seed_data.py          # Initial data seeding
├── migrations/
│   ├── alembic.ini
│   └── versions/
├── tests/
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Requirements.txt
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.1
pandas==2.1.3  # For data import processing
aiofiles==23.2.1  # For async file uploads
pytest==7.4.3
pytest-asyncio==0.21.1
python-dotenv==1.0.0
```

### Key Backend Implementation Tasks for Sonnet

1. **Database Setup**
   - Create SQLAlchemy models with JSONB support
   - Set up Alembic migrations
   - Create indexes for tenant_id + namespace queries

2. **Core API Endpoints**
   ```python
   # Lookups API
   GET  /api/v1/lookups/{namespace}
   GET  /api/v1/lookups/{namespace}/{key}
   POST /api/v1/lookups/bulk
   PUT  /api/v1/lookups/{namespace}/{key}
   DELETE /api/v1/lookups/{namespace}/{key}
   
   # Import API
   POST /api/v1/imports/upload  # Upload CSV/TSV file
   GET  /api/v1/imports/{job_id}/status
   POST /api/v1/imports/{job_id}/confirm
   ```

3. **Import Service Integration**
   ```python
   # app/services/import_service.py
   class ImportService:
       async def process_file(self, file, tenant_id, namespace):
           # Detect file format
           # Parse data
           # Validate
           # Return preview
       
       async def confirm_import(self, job_id):
           # Execute bulk insert
           # Invalidate cache
   ```

4. **Caching Layer (No Redis)**
   - In-memory LRU cache
   - HTTP cache headers for CDN
   - ETag support

## Repository 2: Frontend (`survey-platform-frontend`)

### Initial Setup Commands
```bash
# Create React app with TypeScript
npx create-react-app survey-platform-frontend --template typescript
cd survey-platform-frontend

# Install dependencies
npm install survey-core survey-react-ui
npm install axios react-query @tanstack/react-query
npm install react-router-dom
npm install @mui/material @emotion/react @emotion/styled  # Or your preferred UI library

# Development tools
npm install --save-dev @types/node @types/react @types/react-dom
```

### File Structure
```
survey-platform-frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios instance with auth
│   │   ├── lookups.ts         # Lookup API calls
│   │   └── surveys.ts         # Survey API calls
│   ├── components/
│   │   ├── Survey/
│   │   │   ├── SurveyRenderer.tsx
│   │   │   ├── SurveyBuilder.tsx
│   │   │   └── DynamicDropdown.tsx
│   │   ├── Lookups/
│   │   │   ├── LookupManager.tsx
│   │   │   ├── LookupImporter.tsx
│   │   │   └── LookupTable.tsx
│   │   └── common/
│   │       ├── Layout.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useLookups.ts      # Lookup data fetching
│   │   ├── useSurvey.ts       # Survey state management
│   │   └── useCache.ts        # Local caching
│   ├── pages/
│   │   ├── SurveyPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── ImportPage.tsx
│   ├── types/
│   │   ├── lookup.ts
│   │   └── survey.ts
│   ├── utils/
│   │   ├── auth.ts
│   │   └── cache.ts
│   ├── App.tsx
│   └── index.tsx
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
└── README.md
```

### Key Frontend Implementation Tasks for Sonnet

1. **SurveyJS Integration**
   - Configure choicesByUrl with auth headers
   - Handle large lists with search
   - Implement cascading dropdowns

2. **Import UI**
   ```typescript
   // CSV upload component
   // Preview imported data
   // Map columns to namespaces
   // Show import progress
   ```

3. **Lookup Management UI**
   - Browse namespaces
   - Search/filter lookups
   - Manual edit capability
   - Bulk operations

## Integration of Import Scripts

The import scripts should be integrated into the backend in two ways:

### 1. API Endpoint for File Upload
```python
# app/api/v1/imports.py
@router.post("/upload")
async def upload_import_file(
    file: UploadFile = File(...),
    namespace: str = Form(...),
    file_type: str = Form(...),  # "zip_market", "hospital", "hospital_system"
    tenant_id: UUID = Depends(get_current_tenant)
):
    # Save file temporarily
    # Process with appropriate importer
    # Return preview of data to be imported
    return {
        "job_id": job_id,
        "preview": preview_data,
        "total_records": count
    }
```

### 2. Command-Line Scripts for Admin Use
```python
# scripts/importers/bulk_import.py
"""
Admin script for importing data directly
Usage: python scripts/importers/bulk_import.py --tenant-id xxx --file data.csv --type zip_market
"""
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/survey_platform
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:3000"]
MAX_UPLOAD_SIZE=104857600  # 100MB
CACHE_TTL=3600
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_TENANT_ID=test-tenant
REACT_APP_ENVIRONMENT=development
```

## Docker Compose for Development
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: survey_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./survey-platform-backend
    volumes:
      - ./survey-platform-backend:/app
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/survey_platform
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    command: uvicorn app.main:app --reload --host 0.0.0.0

  frontend:
    build: ./survey-platform-frontend
    volumes:
      - ./survey-platform-frontend:/app
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## Instructions for Sonnet Agents

### Backend Agent Instructions:
1. Start with database models and migrations
2. Implement basic CRUD for lookups
3. Add tenant isolation middleware
4. Build import service with file parsing
5. Add caching layer with HTTP headers
6. Create comprehensive tests
7. Document API with OpenAPI/Swagger

### Frontend Agent Instructions:
1. Set up React with TypeScript
2. Implement SurveyJS basic rendering
3. Add dynamic lookup loading
4. Build import UI with preview
5. Add lookup management interface
6. Implement client-side caching
7. Add error handling and loading states

### Testing the Integration:
1. Use the provided sample data files
2. Test with 233K ZIP records for performance
3. Verify cascading dropdowns work
4. Test search on large lists
5. Verify multi-tenant isolation

## Success Criteria:
- [ ] Can import 233K ZIP mappings in < 30 seconds
- [ ] Dropdown with 6,000 items loads in < 200ms (cached)
- [ ] Search works on large lists
- [ ] Cascading dropdowns filter correctly
- [ ] Multi-tenant data isolation works
- [ ] CDN caching reduces API calls by 80%+

With these specifications, two Sonnet agents should be able to build working repositories that integrate seamlessly!