/**
 * Event Store - Persistence layer for events
 */

import { EventEmitter } from 'events';
import { Event, EventRecord, SendResult, EventFilters, PaginatedResult } from '../domain/types.js';
import { IStorage } from '../infrastructure/storage/storage.interface.js';

export class EventStore extends EventEmitter {
  constructor(private storage: IStorage) {
    super();
  }

  /**
   * Save event and results
   */
  async save(event: Event, results: SendResult[]): Promise<void> {
    const record: Partial<EventRecord> = {
      trace_id: event.trace_id,
      source: event.source,
      event_type: event.event_type,
      severity: event.severity,
      title: event.title,
      summary: event.summary,
      context: event.context,
      actions: event.actions,
      timestamp: event.timestamp,
      channels_sent: results.map((r) => r.channel),
      status: this.determineStatus(results),
      created_at: new Date(),
    };

    const saved = await this.storage.insert('events', record);

    // Emit event for SSE
    this.emit('event:created', saved);
  }

  /**
   * Query events
   */
  async query(filters: EventFilters): Promise<PaginatedResult<EventRecord>> {
    return this.storage.query('events', filters);
  }

  /**
   * Get event by ID
   */
  async getById(id: number): Promise<EventRecord | null> {
    return this.storage.findOne('events', { id });
  }

  /**
   * Get event by trace ID
   */
  async getByTraceId(traceId: string): Promise<EventRecord | null> {
    return this.storage.findOne('events', { trace_id: traceId });
  }

  /**
   * Delete event
   */
  async delete(id: number): Promise<void> {
    await this.storage.delete('events', { id });
    this.emit('event:deleted', id);
  }

  private determineStatus(results: SendResult[]): 'success' | 'partial' | 'failed' {
    if (results.length === 0) return 'failed';

    const successCount = results.filter((r) => r.success).length;

    if (successCount === 0) return 'failed';
    if (successCount === results.length) return 'success';
    return 'partial';
  }
}
