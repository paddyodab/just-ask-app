# Implementation Guide for Survey Platform

## Quick Start for Sonnet

This guide provides step-by-step implementation details to build the survey platform with FastAPI backend and React SurveyJS frontend.

## Project Setup Commands

### Backend Setup
```bash
# Create project structure
mkdir survey-platform && cd survey-platform
mkdir backend && cd backend

# Initialize Python project
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << EOF
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
pytest==7.4.3
pytest-asyncio==0.21.1
EOF

pip install -r requirements.txt

# Initialize Alembic for migrations
alembic init migrations
```

### Frontend Setup
```bash
# In project root
npx create-react-app frontend --template typescript
cd frontend

# Install dependencies
npm install survey-core survey-react-ui
npm install axios react-query
npm install @types/node @types/react @types/react-dom

# Development dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

## Database Schema Implementation

### 1. Complete Database Models
```python
# backend/app/models/base.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# backend/app/models/tenant.py
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.models.base import Base

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    subdomain = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    settings = Column(JSONB, default={})

# backend/app/models/lookup.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
from app.models.base import Base

class Lookup(Base):
    __tablename__ = "lookups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    namespace = Column(String, nullable=False)
    key = Column(String, nullable=False)
    value = Column(JSONB, nullable=False)  # {"value": "key", "text": "Display Text"}
    version = Column(Integer, default=1)
    parent_key = Column(String, nullable=True)  # For hierarchical data
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete
    
    __table_args__ = (
        Index('idx_tenant_namespace', 'tenant_id', 'namespace'),
        Index('idx_tenant_namespace_key', 'tenant_id', 'namespace', 'key'),
        Index('idx_tenant_namespace_parent', 'tenant_id', 'namespace', 'parent_key'),
        Index('idx_active_lookups', 'tenant_id', 'namespace', 
              postgresql_where=Column('deleted_at').is_(None)),
    )

# backend/app/models/survey.py
class Survey(Base):
    __tablename__ = "surveys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    schema = Column(JSONB, nullable=False)  # SurveyJS JSON schema
    settings = Column(JSONB, default={})
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 2. Pydantic Schemas
```python
# backend/app/schemas/lookup.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class SurveyJSChoice(BaseModel):
    """Format expected by SurveyJS choicesByUrl"""
    value: str
    text: str

class LookupBase(BaseModel):
    namespace: str
    key: str
    value: Dict[str, Any]
    parent_key: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class LookupCreate(LookupBase):
    pass

class LookupUpdate(BaseModel):
    value: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class LookupResponse(LookupBase):
    id: UUID
    tenant_id: UUID
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LookupBulkImport(BaseModel):
    namespace: str
    lookups: List[Dict[str, Any]]
    replace_existing: bool = False

class LookupQuery(BaseModel):
    namespace: str
    parent_key: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=100, ge=1, le=1000)
```

## API Implementation Details

### 3. Complete API Endpoints
```python
# backend/app/api/v1/lookups.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import hashlib
import json

from app.models import Lookup
from app.schemas.lookup import (
    LookupCreate, LookupResponse, SurveyJSChoice, 
    LookupQuery, LookupBulkImport
)
from app.dependencies import get_db, get_current_tenant
from app.services.lookup_service import LookupService
from app.services.cache_service import cache_service

router = APIRouter(prefix="/api/v1/lookups", tags=["lookups"])

@router.get("/{namespace}", response_model=List[SurveyJSChoice])
async def get_namespace_lookups(
    namespace: str,
    response: Response,
    parent_key: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=1000),
    tenant_id: UUID = Depends(get_current_tenant),
    if_none_match: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get lookups for a namespace in SurveyJS format.
    Supports pagination, search, and hierarchical filtering.
    """
    # Generate cache key
    cache_key = f"{tenant_id}:{namespace}:{parent_key}:{search}:{page}:{size}"
    
    # Try cache first
    cached_data = await cache_service.get(cache_key)
    if cached_data:
        data = cached_data
    else:
        # Fetch from database
        service = LookupService(db)
        lookups = await service.get_lookups(
            tenant_id=tenant_id,
            namespace=namespace,
            parent_key=parent_key,
            search=search,
            page=page,
            size=size
        )
        
        # Transform to SurveyJS format
        data = [
            SurveyJSChoice(
                value=lookup.value.get("value", lookup.key),
                text=lookup.value.get("text", lookup.value.get("value", lookup.key))
            )
            for lookup in lookups
        ]
        
        # Cache the result
        await cache_service.set(cache_key, data, ttl=3600)
    
    # Generate ETag
    etag = hashlib.md5(json.dumps(data).encode()).hexdigest()
    
    # Check if client has current version
    if if_none_match == etag:
        response.status_code = 304
        return []
    
    # Set cache headers for CDN
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400"
    response.headers["ETag"] = etag
    response.headers["Vary"] = "X-Tenant-ID"
    
    return data

@router.post("/bulk", response_model=Dict[str, Any])
async def bulk_import_lookups(
    data: LookupBulkImport,
    tenant_id: UUID = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Bulk import lookups for a namespace.
    Useful for initial data loading or updates.
    """
    service = LookupService(db)
    result = await service.bulk_import(
        tenant_id=tenant_id,
        namespace=data.namespace,
        lookups=data.lookups,
        replace_existing=data.replace_existing
    )
    
    # Invalidate cache for this namespace
    await cache_service.invalidate_pattern(f"{tenant_id}:{data.namespace}")
    
    return result

@router.get("/{namespace}/{key}", response_model=LookupResponse)
async def get_specific_lookup(
    namespace: str,
    key: str,
    response: Response,
    tenant_id: UUID = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific lookup by key."""
    lookup = db.query(Lookup).filter(
        Lookup.tenant_id == tenant_id,
        Lookup.namespace == namespace,
        Lookup.key == key,
        Lookup.deleted_at.is_(None)
    ).first()
    
    if not lookup:
        raise HTTPException(status_code=404, detail="Lookup not found")
    
    # Set cache headers
    response.headers["Cache-Control"] = "public, max-age=3600"
    
    return lookup

@router.put("/{namespace}/{key}")
async def update_lookup(
    namespace: str,
    key: str,
    data: LookupUpdate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update a specific lookup."""
    lookup = db.query(Lookup).filter(
        Lookup.tenant_id == tenant_id,
        Lookup.namespace == namespace,
        Lookup.key == key,
        Lookup.deleted_at.is_(None)
    ).first()
    
    if not lookup:
        raise HTTPException(status_code=404, detail="Lookup not found")
    
    if data.value is not None:
        lookup.value = data.value
    if data.metadata is not None:
        lookup.metadata = data.metadata
    
    lookup.version += 1
    db.commit()
    
    # Invalidate cache
    await cache_service.invalidate_pattern(f"{tenant_id}:{namespace}")
    
    return {"success": True, "version": lookup.version}
```

### 4. Service Layer Implementation
```python
# backend/app/services/lookup_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from uuid import UUID
from app.models import Lookup

class LookupService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_lookups(
        self,
        tenant_id: UUID,
        namespace: str,
        parent_key: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 100
    ) -> List[Lookup]:
        """Get lookups with filtering and pagination."""
        query = self.db.query(Lookup).filter(
            Lookup.tenant_id == tenant_id,
            Lookup.namespace == namespace,
            Lookup.deleted_at.is_(None)
        )
        
        # Filter by parent if hierarchical
        if parent_key is not None:
            query = query.filter(Lookup.parent_key == parent_key)
        
        # Search in value JSONB
        if search:
            # Search in both value and text fields
            query = query.filter(
                or_(
                    func.lower(Lookup.value['text'].astext).contains(search.lower()),
                    func.lower(Lookup.value['value'].astext).contains(search.lower()),
                    func.lower(Lookup.key).contains(search.lower())
                )
            )
        
        # Pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        
        # Order by key for consistency
        query = query.order_by(Lookup.key)
        
        return query.all()
    
    async def bulk_import(
        self,
        tenant_id: UUID,
        namespace: str,
        lookups: List[Dict[str, Any]],
        replace_existing: bool = False
    ) -> Dict[str, Any]:
        """Bulk import lookups."""
        
        if replace_existing:
            # Soft delete existing lookups
            self.db.query(Lookup).filter(
                Lookup.tenant_id == tenant_id,
                Lookup.namespace == namespace,
                Lookup.deleted_at.is_(None)
            ).update({"deleted_at": func.now()})
        
        # Create new lookups
        created = 0
        updated = 0
        
        for lookup_data in lookups:
            key = lookup_data.get("key") or lookup_data.get("value")
            
            # Check if exists
            existing = self.db.query(Lookup).filter(
                Lookup.tenant_id == tenant_id,
                Lookup.namespace == namespace,
                Lookup.key == key,
                Lookup.deleted_at.is_(None)
            ).first()
            
            if existing:
                # Update existing
                existing.value = {
                    "value": lookup_data.get("value", key),
                    "text": lookup_data.get("text", lookup_data.get("value", key))
                }
                existing.parent_key = lookup_data.get("parent_key")
                existing.version += 1
                updated += 1
            else:
                # Create new
                new_lookup = Lookup(
                    tenant_id=tenant_id,
                    namespace=namespace,
                    key=key,
                    value={
                        "value": lookup_data.get("value", key),
                        "text": lookup_data.get("text", lookup_data.get("value", key))
                    },
                    parent_key=lookup_data.get("parent_key"),
                    metadata=lookup_data.get("metadata", {})
                )
                self.db.add(new_lookup)
                created += 1
        
        self.db.commit()
        
        return {
            "created": created,
            "updated": updated,
            "total": created + updated
        }
```

### 5. Authentication & Authorization
```python
# backend/app/dependencies.py
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.base import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_tenant(
    x_tenant_id: Optional[str] = Header(None)
) -> UUID:
    """
    Extract tenant ID from header.
    In production, this should validate against JWT token.
    """
    if not x_tenant_id:
        raise HTTPException(
            status_code=400,
            detail="X-Tenant-ID header is required"
        )
    
    try:
        return UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid tenant ID format"
        )

# For production, implement proper JWT authentication:
# backend/app/auth/jwt.py
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "your-secret-key-here"  # Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

## Frontend Implementation

### 6. React Components
```typescript
// frontend/src/components/SurveyRenderer.tsx
import React, { useEffect, useState } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/defaultV2.css';
import { getAuthToken, getTenantId } from '../utils/auth';

interface SurveyRendererProps {
  surveyJson: any;
  onComplete?: (result: any) => void;
}

export const SurveyRenderer: React.FC<SurveyRendererProps> = ({ 
  surveyJson, 
  onComplete 
}) => {
  const [survey, setSurvey] = useState<Model | null>(null);

  useEffect(() => {
    const model = new Model(surveyJson);
    
    // Configure choicesByUrl authentication
    model.onLoadChoicesFromServer.add((sender, options) => {
      // Add auth headers
      options.setHeaders = {
        'Authorization': `Bearer ${getAuthToken()}`,
        'X-Tenant-ID': getTenantId()
      };
      
      // Handle search for large lists
      const question = options.question;
      if (question.searchEnabled && options.searchText) {
        const url = new URL(options.url, window.location.origin);
        url.searchParams.set('search', options.searchText);
        options.url = url.toString();
      }
    });
    
    // Handle completion
    if (onComplete) {
      model.onComplete.add(onComplete);
    }
    
    setSurvey(model);
  }, [surveyJson, onComplete]);

  if (!survey) return <div>Loading...</div>;

  return <Survey model={survey} />;
};

// frontend/src/hooks/useLookups.ts
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';

interface UseLookupOptions {
  namespace: string;
  parentKey?: string;
  search?: string;
  page?: number;
  size?: number;
}

export function useLookups(options: UseLookupOptions) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cacheKey = `lookups:${JSON.stringify(options)}`;
    
    // Check localStorage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data: cachedData, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // Use cache if less than 1 hour old
      if (age < 3600000) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    // Fetch from API
    const fetchLookups = async () => {
      try {
        const params = new URLSearchParams();
        if (options.parentKey) params.set('parent_key', options.parentKey);
        if (options.search) params.set('search', options.search);
        if (options.page) params.set('page', options.page.toString());
        if (options.size) params.set('size', options.size.toString());

        const response = await axios.get(
          `/api/v1/lookups/${options.namespace}?${params}`,
          { headers: getAuthHeaders() }
        );

        const responseData = response.data;
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          data: responseData,
          timestamp: Date.now()
        }));

        setData(responseData);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchLookups();
  }, [options]);

  return { data, loading, error };
}
```

### 7. Example Survey with Dynamic Lookups
```typescript
// frontend/src/surveys/exampleSurvey.ts
export const marketAreaSurvey = {
  title: "Market Area Survey",
  pages: [{
    name: "page1",
    elements: [{
      type: "dropdown",
      name: "market_area",
      title: "Select your market area",
      isRequired: true,
      choicesByUrl: {
        url: "/api/v1/lookups/market-areas",
        valueName: "value",
        titleName: "text"
      }
    }, {
      type: "dropdown",
      name: "hospital",
      title: "Select your hospital",
      isRequired: true,
      visibleIf: "{market_area} notempty",
      choicesByUrl: {
        // Dynamic URL based on market area selection
        url: "/api/v1/lookups/hospitals?parent_key={market_area}",
        valueName: "value",
        titleName: "text"
      }
    }, {
      type: "dropdown",
      name: "zip_code",
      title: "Enter ZIP code",
      visibleIf: "{market_area} notempty",
      searchEnabled: true,  // Enable search for large lists
      choicesByUrl: {
        url: "/api/v1/lookups/zip-codes?parent_key={market_area}",
        valueName: "value",
        titleName: "text"
      }
    }]
  }]
};
```

## Deployment Configuration

### 8. Docker Setup
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### 9. Docker Compose
```yaml
# docker-compose.yml
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
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/survey_platform
      SECRET_KEY: your-secret-key-here
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 10. Environment Variables
```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost/survey_platform
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=["http://localhost:3000"]
ENVIRONMENT=development

# frontend/.env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_TENANT_ID=test-tenant-id
```

## Testing

### 11. API Tests
```python
# backend/tests/test_lookups.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_get_lookups():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/lookups/test-namespace",
            headers={"X-Tenant-ID": "test-tenant-id"}
        )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_bulk_import():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/lookups/bulk",
            json={
                "namespace": "test-namespace",
                "lookups": [
                    {"value": "1", "text": "Option 1"},
                    {"value": "2", "text": "Option 2"}
                ]
            },
            headers={"X-Tenant-ID": "test-tenant-id"}
        )
    assert response.status_code == 200
    assert response.json()["created"] == 2
```

## Migration Scripts

### 12. Database Migrations
```python
# migrations/versions/001_initial_schema.py
"""Initial schema

Revision ID: 001
Create Date: 2024-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Create tenants table
    op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('subdomain', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('settings', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subdomain')
    )
    
    # Create lookups table
    op.create_table('lookups',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('namespace', sa.String(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', postgresql.JSONB(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=True),
        sa.Column('parent_key', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_tenant_namespace', 'lookups', ['tenant_id', 'namespace'])
    op.create_index('idx_tenant_namespace_key', 'lookups', ['tenant_id', 'namespace', 'key'])
    op.create_index('idx_tenant_namespace_parent', 'lookups', ['tenant_id', 'namespace', 'parent_key'])

def downgrade():
    op.drop_table('lookups')
    op.drop_table('tenants')
```

## Sample Data

### 13. Seed Data Script
```python
# backend/scripts/seed_data.py
import asyncio
from uuid import uuid4
from app.models import Tenant, Lookup
from app.models.base import SessionLocal

async def seed_data():
    db = SessionLocal()
    
    # Create test tenant
    tenant = Tenant(
        id=uuid4(),
        name="Test Company",
        subdomain="test",
        is_active=True
    )
    db.add(tenant)
    
    # Create sample lookups
    lookups = [
        # Market areas
        Lookup(
            tenant_id=tenant.id,
            namespace="market-areas",
            key="ma-001",
            value={"value": "ma-001", "text": "North Region"}
        ),
        Lookup(
            tenant_id=tenant.id,
            namespace="market-areas",
            key="ma-002",
            value={"value": "ma-002", "text": "South Region"}
        ),
        
        # Hospitals (hierarchical)
        Lookup(
            tenant_id=tenant.id,
            namespace="hospitals",
            key="hosp-001",
            value={"value": "hosp-001", "text": "General Hospital North"},
            parent_key="ma-001"
        ),
        Lookup(
            tenant_id=tenant.id,
            namespace="hospitals",
            key="hosp-002",
            value={"value": "hosp-002", "text": "Regional Medical Center"},
            parent_key="ma-001"
        ),
        
        # ZIP codes (large dataset example)
        *[
            Lookup(
                tenant_id=tenant.id,
                namespace="zip-codes",
                key=f"{10000 + i}",
                value={"value": f"{10000 + i}", "text": f"ZIP {10000 + i}"},
                parent_key="ma-001" if i < 500 else "ma-002"
            )
            for i in range(1000)  # Create 1000 ZIP codes
        ]
    ]
    
    for lookup in lookups:
        db.add(lookup)
    
    db.commit()
    print(f"Created tenant: {tenant.id}")
    print(f"Created {len(lookups)} lookups")

if __name__ == "__main__":
    asyncio.run(seed_data())
```

## Run Commands

### 14. Development Commands
```bash
# Backend
cd backend
alembic upgrade head  # Run migrations
python scripts/seed_data.py  # Seed initial data
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm start

# Run tests
cd backend
pytest

# Format code
black .
isort .

# Type checking
mypy app/
```

## Key Implementation Notes for Sonnet:

1. **Start with the database models and migrations** - Get the schema right first
2. **Implement authentication early** - Even if basic, it's needed for tenant isolation
3. **Test the lookup API with curl/Postman** before building the frontend
4. **Use the cache service consistently** - It's critical for performance
5. **Handle errors gracefully** - Both API and frontend need proper error handling
6. **Test with large datasets early** - Create 10,000+ lookups to test pagination
7. **Use TypeScript strictly** in frontend for better development experience
8. **Implement health check endpoints** for monitoring

This guide should give Sonnet everything needed to build a working implementation!