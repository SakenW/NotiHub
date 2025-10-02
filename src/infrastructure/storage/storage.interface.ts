/**
 * Storage Interface
 */

import { EventRecord, EventFilters, PaginatedResult } from '../../domain/types.js';

export interface IStorage {
  /**
   * Initialize storage
   */
  init(): Promise<void>;

  /**
   * Insert record
   */
  insert(table: string, data: any): Promise<any>;

  /**
   * Query records
   */
  query(table: string, filters: EventFilters): Promise<PaginatedResult<EventRecord>>;

  /**
   * Find one record
   */
  findOne(table: string, criteria: any): Promise<any | null>;

  /**
   * Update record
   */
  update(table: string, criteria: any, data: any): Promise<void>;

  /**
   * Delete record
   */
  delete(table: string, criteria: any): Promise<void>;

  /**
   * Close storage connection
   */
  close(): Promise<void>;
}
