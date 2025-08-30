// Simple client-side cache implementation

interface CacheItem<T> {
  data: T
  timestamp: number
}

class Cache {
  private cache: Map<string, CacheItem<any>> = new Map()
  private defaultTTL = 3600000 // 1 hour in milliseconds

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.defaultTTL)
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.timestamp) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.timestamp) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  clear(): void {
    this.cache.clear()
  }

  clearPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }
}

export const cache = new Cache()

// LocalStorage wrapper for persistent caching
export const persistentCache = {
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now() + (ttl || 3600000)
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(item))
  },

  get<T>(key: string): T | null {
    const stored = localStorage.getItem(`cache_${key}`)
    if (!stored) return null

    try {
      const item: CacheItem<T> = JSON.parse(stored)
      if (Date.now() > item.timestamp) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }
      return item.data
    } catch {
      return null
    }
  },

  clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key)
      }
    })
  }
}