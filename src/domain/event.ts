/**
 * Event domain model
 */

import { Event, EventType, Severity, Action } from './types.js';
import { nanoid } from 'nanoid';

export class EventModel {
  source: string;
  event_type: EventType;
  severity: Severity;
  title: string;
  summary: string;
  context?: Record<string, any>;
  actions?: Action[];
  trace_id: string;
  timestamp: Date;

  constructor(data: Partial<Event>) {
    this.source = data.source || 'unknown';
    this.event_type = data.event_type || 'info';
    this.severity = data.severity || 'low';
    this.title = data.title || '';
    this.summary = data.summary || '';
    this.context = data.context;
    this.actions = data.actions;
    this.trace_id = data.trace_id || nanoid();
    this.timestamp = data.timestamp || new Date();
  }

  /**
   * Validate event data
   */
  validate(): boolean {
    if (!this.source || !this.title) {
      return false;
    }
    return true;
  }

  /**
   * Generate deduplication key
   */
  getDeduplicationKey(): string {
    return `${this.trace_id}:${this.event_type}`;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Event {
    return {
      source: this.source,
      event_type: this.event_type,
      severity: this.severity,
      title: this.title,
      summary: this.summary,
      context: this.context,
      actions: this.actions,
      trace_id: this.trace_id,
      timestamp: this.timestamp,
    };
  }

  /**
   * Convert to plain text (fallback)
   */
  toPlainText(): string {
    const lines = [
      `[${this.severity.toUpperCase()}] ${this.title}`,
      `Source: ${this.source}`,
      `Type: ${this.event_type}`,
      `Summary: ${this.summary}`,
    ];

    if (this.context && Object.keys(this.context).length > 0) {
      lines.push('Context:');
      for (const [key, value] of Object.entries(this.context)) {
        lines.push(`  ${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }
}
