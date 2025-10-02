/**
 * Input adapter interface - Input source contract
 */

import { Event } from '../../../domain/types.js';

export interface InputAdapter {
  /**
   * Adapter name (e.g., 'claude-code', 'codex', 'github')
   */
  readonly name: string;

  /**
   * Adapter version
   */
  readonly version: string;

  /**
   * Parse raw input into standard Event model
   * @param rawInput - Raw input data from the source
   * @returns Single event or array of events
   */
  parse(rawInput: unknown): Promise<Event | Event[]>;

  /**
   * Validate input format
   * @param rawInput - Raw input data to validate
   */
  validate(rawInput: unknown): boolean;

  /**
   * Get adapter configuration schema
   */
  getConfigSchema(): object;

  /**
   * Optional: Transform event before processing
   */
  transform?(event: Event): Event;
}

export abstract class BaseInputAdapter implements InputAdapter {
  abstract name: string;
  abstract version: string;

  constructor(protected config?: any) {}

  abstract parse(rawInput: unknown): Promise<Event | Event[]>;

  abstract validate(rawInput: unknown): boolean;

  abstract getConfigSchema(): object;

  /**
   * Helper method to create Event from partial data
   */
  protected createEvent(data: Partial<Event>): Event {
    return {
      source: data.source || this.name,
      event_type: data.event_type || 'info',
      severity: data.severity || 'low',
      title: data.title || '',
      summary: data.summary || '',
      context: data.context,
      actions: data.actions,
      trace_id: data.trace_id || this.generateTraceId(),
      timestamp: data.timestamp || new Date(),
    };
  }

  /**
   * Generate unique trace ID
   */
  protected generateTraceId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
