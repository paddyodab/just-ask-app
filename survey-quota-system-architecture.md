# Survey Quota System Architecture - Deep Dive

## Executive Summary

This document outlines a comprehensive survey quota system for the Just Ask! application. The system enables survey administrators to set quotas on response collection based on demographic or response criteria, preventing over-sampling and ensuring balanced data collection. Since SurveyJS doesn't natively support quotas, this implementation provides a robust solution through database-driven quota management with real-time checking.

## System Overview

The quota system consists of three main components:
1. **Database Layer**: Flexible quota definitions using JSONB fields
2. **Backend API**: Quota validation and management endpoints
3. **Frontend Integration**: SurveyJS event hooks for real-time quota checking

## Database Schema Design

### Core Tables

#### 1. survey_quotas Table
```sql
CREATE TABLE survey_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_hex VARCHAR(32) NOT NULL,
    namespace_slug VARCHAR(255) NOT NULL,
    survey_id VARCHAR(255) NOT NULL,
    survey_version INTEGER NOT NULL,
    quota_name VARCHAR(255) NOT NULL,
    quota_definition JSONB NOT NULL,
    max_responses INTEGER NOT NULL,
    current_responses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_survey_quotas_survey FOREIGN KEY (customer_hex, namespace_slug, survey_id, survey_version) 
        REFERENCES surveys(customer_hex, namespace_slug, survey_id, version),
    CONSTRAINT unique_quota_per_survey UNIQUE (customer_hex, namespace_slug, survey_id, survey_version, quota_name),
    CONSTRAINT positive_max_responses CHECK (max_responses > 0),
    CONSTRAINT non_negative_current_responses CHECK (current_responses >= 0)
);

-- Indexes for performance
CREATE INDEX idx_survey_quotas_lookup ON survey_quotas (customer_hex, namespace_slug, survey_id, survey_version);
CREATE INDEX idx_survey_quotas_active ON survey_quotas (is_active) WHERE is_active = true;
CREATE INDEX idx_survey_quotas_definition ON survey_quotas USING GIN (quota_definition);
```

#### 2. customer_quota_config Table
```sql
CREATE TABLE customer_quota_config (
    customer_hex VARCHAR(32) PRIMARY KEY,
    check_timing VARCHAR(20) DEFAULT 'on_page_change' CHECK (check_timing IN ('real_time', 'on_page_change', 'on_submit')),
    enforcement_level VARCHAR(20) DEFAULT 'block' CHECK (enforcement_level IN ('warn', 'block', 'redirect')),
    redirect_url VARCHAR(500),
    custom_messages JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_customer_quota_config FOREIGN KEY (customer_hex) REFERENCES customers(customer_hex)
);
```

#### 3. survey_quota_config Table
```sql
CREATE TABLE survey_quota_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_hex VARCHAR(32) NOT NULL,
    namespace_slug VARCHAR(255) NOT NULL,
    survey_id VARCHAR(255) NOT NULL,
    survey_version INTEGER NOT NULL,
    check_timing VARCHAR(20),
    enforcement_level VARCHAR(20),
    redirect_url VARCHAR(500),
    custom_messages JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_survey_quota_config FOREIGN KEY (customer_hex, namespace_slug, survey_id, survey_version) 
        REFERENCES surveys(customer_hex, namespace_slug, survey_id, version),
    CONSTRAINT unique_config_per_survey UNIQUE (customer_hex, namespace_slug, survey_id, survey_version),
    CONSTRAINT valid_check_timing CHECK (check_timing IS NULL OR check_timing IN ('real_time', 'on_page_change', 'on_submit')),
    CONSTRAINT valid_enforcement_level CHECK (enforcement_level IS NULL OR enforcement_level IN ('warn', 'block', 'redirect'))
);
```

### JSONB Quota Definition Examples

#### Simple Demographic Quota
```json
{
  "type": "demographic",
  "criteria": {
    "age_group": ["18-25", "26-35"],
    "gender": ["male"]
  },
  "description": "Males aged 18-35"
}
```

#### Response-Based Quota
```json
{
  "type": "response_based",
  "criteria": {
    "preferred_cuisine": ["italian", "mexican"],
    "dining_frequency": ["weekly", "daily"]
  },
  "description": "Regular Italian/Mexican diners"
}
```

#### Complex Multi-Condition Quota
```json
{
  "type": "complex",
  "logic": "AND",
  "conditions": [
    {
      "field": "department",
      "operator": "in",
      "values": ["engineering", "design"]
    },
    {
      "field": "experience_years",
      "operator": ">=",
      "values": [5]
    }
  ],
  "description": "Senior Engineering/Design staff"
}
```

## Backend API Design

### Quota Management Endpoints

#### 1. Create Quota
```http
POST /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/surveys/{survey_id}/versions/{version}/quotas
```

**Request Body:**
```json
{
  "quota_name": "male_18_35",
  "quota_definition": {
    "type": "demographic",
    "criteria": {
      "age_group": ["18-25", "26-35"],
      "gender": ["male"]
    }
  },
  "max_responses": 100,
  "description": "Males aged 18-35"
}
```

#### 2. Check Quota Availability
```http
POST /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/surveys/{survey_id}/versions/{version}/quotas/check
```

**Request Body:**
```json
{
  "response_data": {
    "age_group": "26-35",
    "gender": "male",
    "department": "engineering"
  }
}
```

**Response:**
```json
{
  "quota_status": "available|exceeded|warning",
  "matched_quotas": [
    {
      "quota_name": "male_18_35",
      "current_responses": 95,
      "max_responses": 100,
      "remaining": 5,
      "status": "warning"
    }
  ],
  "enforcement_action": "warn|block|redirect",
  "message": "You are approaching the quota limit for your demographic group.",
  "redirect_url": null
}
```

#### 3. Record Response for Quota
```http
POST /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/surveys/{survey_id}/versions/{version}/quotas/record
```

**Request Body:**
```json
{
  "response_id": "resp_123",
  "response_data": {
    "age_group": "26-35",
    "gender": "male"
  }
}
```

#### 4. Get Quota Status
```http
GET /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/surveys/{survey_id}/versions/{version}/quotas
```

**Response:**
```json
{
  "quotas": [
    {
      "quota_name": "male_18_35",
      "quota_definition": {...},
      "current_responses": 95,
      "max_responses": 100,
      "percentage_filled": 95,
      "status": "active|full|paused",
      "last_response_at": "2025-09-03T14:30:00Z"
    }
  ],
  "total_responses": 450,
  "quota_coverage": 85.5
}
```

### Configuration Endpoints

#### Customer-Level Configuration
```http
PUT /api/v1/operations/customers/{customer_hex}/quota-config
```

```json
{
  "check_timing": "on_page_change",
  "enforcement_level": "block",
  "custom_messages": {
    "quota_exceeded": "Thank you for your interest! We have reached our target for your demographic group.",
    "quota_warning": "We're nearing our target for your demographic group. Please complete the survey soon."
  }
}
```

#### Survey-Level Configuration
```http
PUT /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/surveys/{survey_id}/versions/{version}/quota-config
```

## Frontend SurveyJS Integration

### Core Integration Class

```typescript
// src/services/QuotaManager.ts
import { Survey } from 'survey-core';
import { apiClient } from '../api/client';

export class QuotaManager {
  private survey: Survey;
  private customerHex: string;
  private namespaceSlug: string;
  private surveyId: string;
  private surveyVersion: number;
  private config: QuotaConfig;

  constructor(survey: Survey, surveyMetadata: SurveyMetadata) {
    this.survey = survey;
    this.customerHex = surveyMetadata.customerHex;
    this.namespaceSlug = surveyMetadata.namespaceSlug;
    this.surveyId = surveyMetadata.surveyId;
    this.surveyVersion = surveyMetadata.version;
    
    this.initializeEventHandlers();
    this.loadConfiguration();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const response = await apiClient.get(`/api/v1/operations/customers/${this.customerHex}/quota-config`);
      this.config = response.data;
    } catch (error) {
      console.warn('Failed to load quota configuration, using defaults');
      this.config = {
        check_timing: 'on_page_change',
        enforcement_level: 'block',
        is_enabled: true
      };
    }
  }

  private initializeEventHandlers(): void {
    if (!this.config?.is_enabled) return;

    switch (this.config.check_timing) {
      case 'real_time':
        this.survey.onValueChanging.add(this.handleValueChanging.bind(this));
        break;
      case 'on_page_change':
        this.survey.onCurrentPageChanging.add(this.handlePageChanging.bind(this));
        break;
      case 'on_submit':
        this.survey.onServerValidateQuestions.add(this.handleSubmitValidation.bind(this));
        break;
    }
  }

  private async handleValueChanging(sender: Survey, options: any): Promise<void> {
    if (options.name && this.isQuotaRelevantField(options.name)) {
      await this.checkQuotas(sender.data);
    }
  }

  private async handlePageChanging(sender: Survey, options: any): Promise<void> {
    if (!options.isNextPage) return;
    
    const quotaResult = await this.checkQuotas(sender.data);
    if (quotaResult.quota_status === 'exceeded') {
      options.allow = false;
      this.handleQuotaExceeded(quotaResult);
    }
  }

  private async handleSubmitValidation(sender: Survey, options: any): Promise<void> {
    const quotaResult = await this.checkQuotas(sender.data);
    
    if (quotaResult.quota_status === 'exceeded') {
      options.errors = options.errors || {};
      options.errors['quota_exceeded'] = quotaResult.message;
      this.handleQuotaExceeded(quotaResult);
    }
  }

  private async checkQuotas(responseData: any): Promise<QuotaCheckResult> {
    try {
      const response = await apiClient.post(
        `/api/v1/operations/customers/${this.customerHex}/namespaces/${this.namespaceSlug}/surveys/${this.surveyId}/versions/${this.surveyVersion}/quotas/check`,
        { response_data: responseData }
      );
      
      return response.data;
    } catch (error) {
      console.error('Quota check failed:', error);
      return { quota_status: 'available', matched_quotas: [] };
    }
  }

  private handleQuotaExceeded(result: QuotaCheckResult): void {
    switch (this.config.enforcement_level) {
      case 'warn':
        this.showWarningMessage(result.message);
        break;
      case 'block':
        this.blockSurvey(result.message);
        break;
      case 'redirect':
        this.redirectUser(result.redirect_url);
        break;
    }
  }

  private showWarningMessage(message: string): void {
    // Show non-blocking warning
    const warningPanel = document.createElement('div');
    warningPanel.className = 'quota-warning';
    warningPanel.innerHTML = `
      <div class="warning-content">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">${message}</span>
        <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    this.survey.surveyElement.insertBefore(warningPanel, this.survey.surveyElement.firstChild);
  }

  private blockSurvey(message: string): void {
    // Replace survey with quota exceeded message
    this.survey.surveyElement.innerHTML = `
      <div class="quota-exceeded">
        <h3>Survey Not Available</h3>
        <p>${message}</p>
        <button onclick="window.history.back()">Go Back</button>
      </div>
    `;
  }

  private redirectUser(url?: string): void {
    if (url) {
      window.location.href = url;
    } else {
      window.history.back();
    }
  }

  private isQuotaRelevantField(fieldName: string): boolean {
    // Define which fields should trigger quota checks
    const quotaFields = ['age_group', 'gender', 'department', 'location', 'income_bracket'];
    return quotaFields.includes(fieldName);
  }
}
```

### Integration in Survey Component

```typescript
// src/components/Survey/SurveyComponent.tsx
import React, { useEffect, useState } from 'react';
import { Survey } from 'survey-react-ui';
import { Model as SurveyModel } from 'survey-core';
import { QuotaManager } from '../../services/QuotaManager';

interface SurveyComponentProps {
  surveyJson: any;
  surveyMetadata: SurveyMetadata;
  onComplete: (result: any) => void;
}

export const SurveyComponent: React.FC<SurveyComponentProps> = ({
  surveyJson,
  surveyMetadata,
  onComplete
}) => {
  const [surveyModel, setSurveyModel] = useState<SurveyModel | null>(null);
  const [quotaManager, setQuotaManager] = useState<QuotaManager | null>(null);

  useEffect(() => {
    const model = new SurveyModel(surveyJson);
    
    // Initialize quota manager
    const quotaMgr = new QuotaManager(model, surveyMetadata);
    
    // Handle survey completion with quota recording
    model.onComplete.add(async (sender, options) => {
      try {
        // Record response for quota tracking
        await quotaMgr.recordResponse(sender.data);
        onComplete(options.data);
      } catch (error) {
        console.error('Failed to record quota response:', error);
        onComplete(options.data); // Still complete the survey
      }
    });

    setSurveyModel(model);
    setQuotaManager(quotaMgr);
  }, [surveyJson, surveyMetadata]);

  if (!surveyModel) {
    return <div>Loading survey...</div>;
  }

  return (
    <div className="survey-container">
      <Survey model={surveyModel} />
    </div>
  );
};
```

### Quota Monitoring Dashboard

```typescript
// src/components/Admin/QuotaManagement.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface QuotaManagementProps {
  customerHex: string;
  namespaceSlug: string;
  surveyId: string;
  surveyVersion: number;
}

export const QuotaManagement: React.FC<QuotaManagementProps> = ({
  customerHex,
  namespaceSlug,
  surveyId,
  surveyVersion
}) => {
  const { data: quotas, isLoading } = useQuery({
    queryKey: ['quotas', customerHex, namespaceSlug, surveyId, surveyVersion],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/operations/customers/${customerHex}/namespaces/${namespaceSlug}/surveys/${surveyId}/versions/${surveyVersion}/quotas`
      );
      return response.data;
    }
  });

  if (isLoading) return <div>Loading quotas...</div>;

  return (
    <div className="quota-management">
      <h3>Survey Quotas</h3>
      
      <div className="quota-overview">
        <div className="metric-card">
          <h4>Total Responses</h4>
          <span className="metric-value">{quotas?.total_responses || 0}</span>
        </div>
        <div className="metric-card">
          <h4>Quota Coverage</h4>
          <span className="metric-value">{quotas?.quota_coverage || 0}%</span>
        </div>
      </div>

      <div className="quota-list">
        {quotas?.quotas?.map((quota: any) => (
          <div key={quota.quota_name} className={`quota-card ${quota.status}`}>
            <div className="quota-header">
              <h4>{quota.quota_name}</h4>
              <span className={`status-badge ${quota.status}`}>{quota.status}</span>
            </div>
            
            <div className="quota-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${quota.percentage_filled}%` }}
                />
              </div>
              <span className="progress-text">
                {quota.current_responses} / {quota.max_responses} responses
              </span>
            </div>
            
            <div className="quota-description">
              {quota.quota_definition.description}
            </div>
            
            <div className="quota-actions">
              <button 
                className="btn-secondary"
                onClick={() => editQuota(quota.quota_name)}
              >
                Edit
              </button>
              <button 
                className={`btn-${quota.status === 'active' ? 'warning' : 'primary'}`}
                onClick={() => toggleQuota(quota.quota_name)}
              >
                {quota.status === 'active' ? 'Pause' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Three-Phase Implementation Plan

### Phase 1: Core Quota Engine (Weeks 1-3)

**Database Setup**
- Create survey_quotas table with JSONB quota definitions
- Create customer_quota_config and survey_quota_config tables
- Add necessary indexes for performance
- Create database migration scripts

**Backend API Development**
- Implement quota CRUD endpoints
- Create quota checking logic with JSONB query support
- Add configuration management endpoints
- Implement quota recording and tracking
- Add comprehensive API documentation

**Basic Frontend Integration**
- Create QuotaManager service class
- Implement basic SurveyJS event handlers
- Add quota status display in admin interface
- Create quota management UI components

**Testing**
- Unit tests for quota matching logic
- API endpoint testing
- Basic integration tests

### Phase 2: SurveyJS Integration (Weeks 4-5)

**Advanced Frontend Features**
- Implement all three timing modes (real-time, page-change, submit)
- Add enforcement level handling (warn, block, redirect)
- Create custom warning and blocking UI components
- Add quota progress indicators

**Enhanced Admin Interface**
- Quota creation and editing forms
- Quota performance dashboard
- Real-time quota monitoring
- Bulk quota operations

**Configuration Management**
- Customer-level default configurations
- Survey-level configuration overrides
- Configuration inheritance logic
- Admin UI for configuration management

**Integration Testing**
- End-to-end quota flow testing
- SurveyJS event handler testing
- Configuration override testing

### Phase 3: Advanced Features (Weeks 6-8)

**Advanced Quota Types**
- Time-based quotas (daily, weekly limits)
- Geographic quotas
- Complex multi-condition quotas
- Quota dependencies and hierarchies

**Analytics and Reporting**
- Quota performance analytics
- Response distribution reports
- Quota efficiency metrics
- Export capabilities

**Performance Optimization**
- Quota checking caching
- Bulk quota updates
- Database query optimization
- Real-time monitoring improvements

**Enterprise Features**
- Quota templates and sharing
- Multi-tenant quota isolation
- Advanced security controls
- API rate limiting

## Configuration System

### Timing Configuration
```typescript
interface QuotaConfig {
  check_timing: 'real_time' | 'on_page_change' | 'on_submit';
  enforcement_level: 'warn' | 'block' | 'redirect';
  redirect_url?: string;
  custom_messages: {
    quota_exceeded?: string;
    quota_warning?: string;
    quota_unavailable?: string;
  };
  is_enabled: boolean;
}
```

**real_time**: Check quotas on every field value change
- Provides immediate feedback
- Higher server load
- Best user experience for critical quotas

**on_page_change**: Check quotas when user navigates between pages
- Balanced performance and user experience
- Recommended default setting
- Prevents users from progressing if quota exceeded

**on_submit**: Check quotas only on final survey submission
- Minimal server load
- May frustrate users who complete entire survey
- Suitable for less critical quota management

### Enforcement Levels

**warn**: Show warning message but allow continuation
```typescript
private showWarningMessage(message: string): void {
  // Non-blocking notification
  this.survey.addNavigationItem({
    id: 'quota-warning',
    title: message,
    action: () => this.dismissWarning()
  });
}
```

**block**: Prevent survey continuation
```typescript
private blockSurvey(message: string): void {
  this.survey.mode = 'display';
  this.survey.completedHtml = `
    <div class="quota-exceeded-message">
      <h3>Survey Quota Exceeded</h3>
      <p>${message}</p>
    </div>
  `;
}
```

**redirect**: Redirect to alternative URL
```typescript
private redirectUser(url: string): void {
  setTimeout(() => {
    window.location.href = url;
  }, 2000); // Give user time to read message
}
```

## Error Handling and Edge Cases

### Quota Service Unavailable
```typescript
private async checkQuotasWithFallback(responseData: any): Promise<QuotaCheckResult> {
  try {
    return await this.checkQuotas(responseData);
  } catch (error) {
    console.error('Quota service unavailable:', error);
    
    // Fallback behavior based on configuration
    switch (this.config.fallback_behavior) {
      case 'allow':
        return { quota_status: 'available', matched_quotas: [] };
      case 'block':
        return { 
          quota_status: 'exceeded', 
          message: 'Survey temporarily unavailable. Please try again later.',
          matched_quotas: [] 
        };
      default:
        return { quota_status: 'available', matched_quotas: [] };
    }
  }
}
```

### Race Conditions
```typescript
private async recordResponseWithLock(responseData: any): Promise<void> {
  const lockKey = `quota_lock_${this.customerHex}_${this.surveyId}_${Date.now()}`;
  
  try {
    // Acquire distributed lock
    await this.acquireLock(lockKey);
    
    // Re-check quotas before recording
    const quotaResult = await this.checkQuotas(responseData);
    if (quotaResult.quota_status === 'exceeded') {
      throw new Error('Quota exceeded during final check');
    }
    
    // Record the response
    await this.recordResponse(responseData);
    
  } finally {
    await this.releaseLock(lockKey);
  }
}
```

### Performance Considerations

**Database Indexing**
```sql
-- Composite index for quota lookups
CREATE INDEX idx_survey_quotas_active_lookup 
ON survey_quotas (customer_hex, namespace_slug, survey_id, survey_version, is_active) 
WHERE is_active = true;

-- JSONB index for quota criteria matching
CREATE INDEX idx_quota_definition_criteria 
ON survey_quotas USING GIN ((quota_definition->'criteria'));
```

**Caching Strategy**
```typescript
class QuotaCacheManager {
  private cache = new Map<string, QuotaCheckResult>();
  private readonly TTL = 30000; // 30 seconds

  async getQuotaResult(key: string, fetcher: () => Promise<QuotaCheckResult>): Promise<QuotaCheckResult> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached;
    }

    const result = await fetcher();
    this.cache.set(key, { ...result, timestamp: Date.now() });
    return result;
  }
}
```

## Security Considerations

### Input Validation
```typescript
private validateQuotaDefinition(definition: any): boolean {
  const schema = {
    type: 'object',
    required: ['type', 'criteria'],
    properties: {
      type: { enum: ['demographic', 'response_based', 'complex'] },
      criteria: { type: 'object' },
      description: { type: 'string', maxLength: 500 }
    }
  };
  
  return this.jsonSchemaValidator.validate(definition, schema);
}
```

### Authorization
```typescript
async checkQuotaPermissions(customerHex: string, userId: string): Promise<boolean> {
  // Verify user has quota management permissions for this customer
  const permissions = await this.permissionService.getUserPermissions(userId, customerHex);
  return permissions.includes('manage_quotas');
}
```

This comprehensive architecture provides a robust, scalable survey quota system that integrates seamlessly with SurveyJS while maintaining flexibility through JSONB-based quota definitions and configurable enforcement policies.