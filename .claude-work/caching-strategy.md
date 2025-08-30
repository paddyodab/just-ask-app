# No-Redis Caching Strategy for Survey Platform

## Overview
A multi-layer caching approach that avoids Redis infrastructure complexity while maintaining excellent performance.

## Caching Layers (From Fastest to Slowest)

### 1. Browser Cache (Milliseconds)
```typescript
// Frontend: Aggressive browser caching
const lookupCache = new Map();

async function fetchLookup(namespace: string, key?: string) {
  const cacheKey = `${namespace}:${key || 'all'}`;
  
  // Memory cache (survives during session)
  if (lookupCache.has(cacheKey)) {
    return lookupCache.get(cacheKey);
  }
  
  // LocalStorage cache (survives page refresh)
  const stored = localStorage.getItem(cacheKey);
  if (stored) {
    const { data, timestamp } = JSON.parse(stored);
    const age = Date.now() - timestamp;
    
    // Use cache if less than 1 hour old
    if (age < 3600000) {
      lookupCache.set(cacheKey, data);
      return data;
    }
  }
  
  // Fetch with ETag support
  const response = await fetch(`/api/lookups/${namespace}`, {
    headers: {
      'If-None-Match': localStorage.getItem(`${cacheKey}:etag`)
    }
  });
  
  if (response.status === 304) {
    // Data hasn't changed, use cached version
    return JSON.parse(stored).data;
  }
  
  const data = await response.json();
  const etag = response.headers.get('ETag');
  
  // Store in both caches
  lookupCache.set(cacheKey, data);
  localStorage.setItem(cacheKey, JSON.stringify({ 
    data, 
    timestamp: Date.now() 
  }));
  localStorage.setItem(`${cacheKey}:etag`, etag);
  
  return data;
}
```

### 2. CDN Cache (10-50ms)
```python
# Backend: Set CDN-friendly cache headers
@router.get("/api/lookups/{namespace}")
async def get_lookups(
    namespace: str,
    response: Response,
    tenant_id: UUID = Depends(get_tenant_id),
    if_none_match: Optional[str] = Header(None)
):
    # Generate ETag based on content
    lookups = await db.get_lookups(namespace, tenant_id)
    etag = hashlib.md5(
        f"{namespace}:{tenant_id}:{json.dumps(lookups)}".encode()
    ).hexdigest()
    
    # Check if client has current version
    if if_none_match == etag:
        response.status_code = 304
        return None
    
    # Set aggressive CDN cache headers
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
    response.headers["ETag"] = etag
    response.headers["Vary"] = "X-Tenant-ID"
    
    # CDN will cache per tenant
    response.headers["CDN-Cache-Control"] = "max-age=86400"
    
    return lookups
```

### 3. Application Memory Cache (Nanoseconds)
```python
# Backend: Simple in-memory cache
from functools import lru_cache
from typing import Tuple
import asyncio

class LookupCache:
    def __init__(self, ttl_seconds: int = 300):
        self._cache = {}
        self._timestamps = {}
        self.ttl = ttl_seconds
        
    async def get(
        self, 
        tenant_id: UUID, 
        namespace: str, 
        key: Optional[str] = None
    ):
        cache_key = f"{tenant_id}:{namespace}:{key or ''}"
        
        # Check if cached and valid
        if cache_key in self._cache:
            if time.time() - self._timestamps[cache_key] < self.ttl:
                return self._cache[cache_key]
        
        # Fetch from database
        data = await self._fetch_from_db(tenant_id, namespace, key)
        
        # Store in cache
        self._cache[cache_key] = data
        self._timestamps[cache_key] = time.time()
        
        # Cleanup old entries periodically
        if len(self._cache) > 1000:
            self._cleanup_old_entries()
            
        return data
    
    def _cleanup_old_entries(self):
        """Remove expired entries to prevent memory bloat"""
        current_time = time.time()
        expired = [
            k for k, ts in self._timestamps.items() 
            if current_time - ts > self.ttl
        ]
        for key in expired:
            del self._cache[key]
            del self._timestamps[key]

# Use as singleton
lookup_cache = LookupCache()
```

### 4. PostgreSQL Buffer Cache (Microseconds)
```sql
-- PostgreSQL automatically caches frequently accessed data
-- Tune these settings in postgresql.conf:

-- Increase shared buffers (25% of RAM is good starting point)
shared_buffers = '2GB'

-- Effective cache size (total RAM available for disk caching)
effective_cache_size = '6GB'

-- Create proper indexes for fast lookups
CREATE INDEX idx_lookups_tenant_namespace 
ON lookups(tenant_id, namespace);

CREATE INDEX idx_lookups_tenant_namespace_key 
ON lookups(tenant_id, namespace, key);

-- Use JSONB GIN index for searching within values
CREATE INDEX idx_lookups_value 
ON lookups USING gin(value);

-- Partial index for active lookups only
CREATE INDEX idx_active_lookups 
ON lookups(tenant_id, namespace) 
WHERE deleted_at IS NULL;
```

## Cache Invalidation Strategy

### 1. Event-Based Invalidation
```python
# When lookups change, invalidate caches
async def update_lookup(
    tenant_id: UUID, 
    namespace: str, 
    key: str, 
    value: dict
):
    # Update database
    await db.update_lookup(tenant_id, namespace, key, value)
    
    # Invalidate application cache
    cache_key = f"{tenant_id}:{namespace}:{key}"
    lookup_cache.invalidate(cache_key)
    
    # Return with no-cache headers to update CDN
    return JSONResponse(
        content={"success": True},
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Accel-Expires": "0"  # Nginx cache invalidation
        }
    )
```

### 2. Time-Based Invalidation
```typescript
// Frontend: Smart cache expiry
class SmartCache {
  private cache = new Map();
  
  get(key: string, maxAge: number = 3600000) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    
    // Different TTLs for different data types
    const ttl = this.getTTL(key);
    
    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  getTTL(key: string): number {
    // Static lookups (countries, states): 24 hours
    if (key.includes('static')) return 86400000;
    
    // User-specific lookups: 1 hour
    if (key.includes('user')) return 3600000;
    
    // Default: 5 minutes
    return 300000;
  }
}
```

## CDN Configuration

### Cloudflare Workers (Edge Caching)
```javascript
// Cloudflare Worker for intelligent edge caching
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Cache lookups aggressively
  if (url.pathname.startsWith('/api/lookups/')) {
    const cache = caches.default
    
    // Try cache first
    let response = await cache.match(request)
    
    if (!response) {
      // Fetch from origin
      response = await fetch(request)
      
      // Cache successful responses
      if (response.status === 200) {
        const headers = new Headers(response.headers)
        headers.set('Cache-Control', 'public, max-age=3600')
        
        const cachedResponse = new Response(
          response.body,
          { ...response, headers }
        )
        
        event.waitUntil(cache.put(request, cachedResponse.clone()))
        return cachedResponse
      }
    }
    
    return response
  }
  
  // Don't cache other requests
  return fetch(request)
}
```

### CloudFront Configuration
```yaml
# AWS CloudFront Distribution Config
CacheBehaviors:
  - PathPattern: "/api/lookups/*"
    TargetOriginId: api-origin
    ViewerProtocolPolicy: https-only
    CachePolicyId: 
      CachingOptimized:
        DefaultTTL: 3600
        MaxTTL: 86400
        MinTTL: 1
    OriginRequestPolicyId:
      Headers:
        - X-Tenant-ID  # Forward tenant header
    Compress: true
```

## Performance Metrics

### Expected Response Times
- **Browser Cache Hit**: < 1ms
- **CDN Cache Hit**: 10-50ms
- **Application Cache Hit**: 50-100ms
- **PostgreSQL (cached)**: 100-200ms
- **PostgreSQL (cold)**: 200-500ms

### Cache Hit Ratios (Target)
- Browser Cache: 60-70% (for returning users)
- CDN Cache: 80-90% (for popular lookups)
- Application Cache: 50-60% (for active tenants)
- PostgreSQL Cache: 95%+ (with proper tuning)

## Monitoring

```python
# Track cache performance
import time
from dataclasses import dataclass
from typing import Dict

@dataclass
class CacheMetrics:
    hits: int = 0
    misses: int = 0
    total_time: float = 0
    
    @property
    def hit_ratio(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0
    
    @property
    def avg_time(self) -> float:
        total = self.hits + self.misses
        return self.total_time / total if total > 0 else 0

class MetricsCollector:
    def __init__(self):
        self.metrics: Dict[str, CacheMetrics] = {}
    
    async def track(self, cache_layer: str, cache_hit: bool, duration: float):
        if cache_layer not in self.metrics:
            self.metrics[cache_layer] = CacheMetrics()
        
        metrics = self.metrics[cache_layer]
        if cache_hit:
            metrics.hits += 1
        else:
            metrics.misses += 1
        metrics.total_time += duration
    
    def get_report(self):
        return {
            layer: {
                "hit_ratio": m.hit_ratio,
                "avg_response_time": m.avg_time,
                "total_requests": m.hits + m.misses
            }
            for layer, m in self.metrics.items()
        }

# Usage
metrics = MetricsCollector()

@router.get("/api/lookups/{namespace}")
async def get_lookups_with_metrics(namespace: str):
    start = time.time()
    
    # Try application cache
    data = lookup_cache.get(namespace)
    cache_hit = data is not None
    
    if not cache_hit:
        data = await db.get_lookups(namespace)
        lookup_cache.set(namespace, data)
    
    duration = time.time() - start
    await metrics.track("application", cache_hit, duration)
    
    return data

# Metrics endpoint
@router.get("/api/metrics/cache")
async def get_cache_metrics():
    return metrics.get_report()
```

## Cost Comparison

### Redis (AWS ElastiCache)
- t3.micro: ~$15/month
- t3.small: ~$25/month
- Plus: Data transfer costs
- Plus: Operational overhead

### Our Approach
- CDN: Already needed for frontend (~$20/month for 1TB)
- PostgreSQL: Already needed for data (no extra cost)
- Application Memory: Included with server (no extra cost)
- **Total Additional Cost: $0**

## Summary

This caching strategy provides excellent performance without Redis by:
1. Using browser localStorage for client-side caching
2. Leveraging CDN edge caching with proper HTTP headers
3. Simple in-memory application caching
4. PostgreSQL's built-in buffer cache
5. Smart cache invalidation strategies

The result is a simpler architecture with fewer moving parts, lower operational overhead, and comparable performance to a Redis-based solution.