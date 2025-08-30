#!/bin/bash

# Add hospitals for Market 10
curl -X POST http://localhost:8001/api/v1/lookups/bulk \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{
    "namespace": "hospitals", 
    "lookups": [
      {"value": "hosp-001", "text": "General Hospital North", "parent_key": "10"},
      {"value": "hosp-002", "text": "Regional Medical Center", "parent_key": "10"},
      {"value": "hosp-003", "text": "North Community Hospital", "parent_key": "10"}
    ],
    "replace_existing": false
  }'

# Add hospitals for Market 101
curl -X POST http://localhost:8001/api/v1/lookups/bulk \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{
    "namespace": "hospitals",
    "lookups": [
      {"value": "hosp-004", "text": "South Medical Center", "parent_key": "101"},
      {"value": "hosp-005", "text": "Southern Regional Hospital", "parent_key": "101"}
    ],
    "replace_existing": false
  }'

# Add ZIP codes for Market 10
curl -X POST http://localhost:8001/api/v1/lookups/bulk \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{
    "namespace": "zip-codes",
    "lookups": [
      {"value": "10001", "text": "ZIP 10001 - Market 10"},
      {"value": "10002", "text": "ZIP 10002 - Market 10"},
      {"value": "10003", "text": "ZIP 10003 - Market 10"},
      {"value": "10004", "text": "ZIP 10004 - Market 10"},
      {"value": "10005", "text": "ZIP 10005 - Market 10"}
    ],
    "replace_existing": false
  }'

echo "Data population complete!"