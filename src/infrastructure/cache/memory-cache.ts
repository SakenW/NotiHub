/**
 * In-Memory LRU Cache Implementation
 */

import { LRUCache } from 'lru-cache';
import { ICache } from './cache.interface.js';

export class MemoryCache implements ICache {
  private cache: LRUCache<string, any>;

  constructor(options?: { max?: number; ttl?: number }) {
    this.cache = new LRUCache({
      max: options?.max || 1000,
      ttl: (options?.ttl || 60) * 1000, // convert to ms
      ttlAutopurge: true,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (ttl) {
      this.cache.set(key, value, { ttl: ttl * 1000 });
    } else {
      this.cache.set(key, value);
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
