/**
 * Cache Interface
 */

export interface ICache {
  /**
   * Get value by key
   */
  get<T>(key: string): T | undefined;

  /**
   * Set value with optional TTL (in seconds)
   */
  set<T>(key: string, value: T, ttl?: number): void;

  /**
   * Check if key exists
   */
  has(key: string): boolean;

  /**
   * Delete key
   */
  delete(key: string): void;

  /**
   * Clear all keys
   */
  clear(): void;

  /**
   * Get all keys
   */
  keys(): string[];
}
