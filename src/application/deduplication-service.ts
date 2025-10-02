/**
 * Deduplication Service
 */

import { Event } from '../domain/types.js';
import { ICache } from '../infrastructure/cache/cache.interface.js';

export class DeduplicationService {
  constructor(
    private cache: ICache,
    private ttl: number = 60 // default 60 seconds
  ) {}

  /**
   * Check if event is duplicate
   */
  isDuplicate(event: Event): boolean {
    const key = this.getDeduplicationKey(event);
    const exists = this.cache.has(key);

    if (!exists) {
      // Mark as seen
      this.cache.set(key, true, this.ttl);
      return false;
    }

    return true;
  }

  /**
   * Generate deduplication key
   */
  private getDeduplicationKey(event: Event): string {
    return `dedup:${event.trace_id}:${event.event_type}`;
  }

  /**
   * Clear all deduplication records
   */
  clear(): void {
    // Cache implementation should handle this
  }
}
