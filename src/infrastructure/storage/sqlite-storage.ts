/**
 * SQLite Storage Implementation
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { IStorage } from './storage.interface.js';
import { EventRecord, EventFilters, PaginatedResult } from '../../domain/types.js';

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = join(dbPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async init(): Promise<void> {
    // Create events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trace_id TEXT NOT NULL,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        context TEXT,
        actions TEXT,
        timestamp TEXT NOT NULL,
        channels_sent TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(trace_id, event_type)
      );
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_trace_id ON events(trace_id);
      CREATE INDEX IF NOT EXISTS idx_source ON events(source);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_status ON events(status);
    `);
  }

  async insert(table: string, data: any): Promise<any> {
    if (table !== 'events') {
      throw new Error(`Table ${table} not supported`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO events (
        trace_id, source, event_type, severity, title, summary,
        context, actions, timestamp, channels_sent, status, created_at
      ) VALUES (
        @trace_id, @source, @event_type, @severity, @title, @summary,
        @context, @actions, @timestamp, @channels_sent, @status, @created_at
      )
    `);

    const result = stmt.run({
      trace_id: data.trace_id,
      source: data.source,
      event_type: data.event_type,
      severity: data.severity,
      title: data.title,
      summary: data.summary,
      context: data.context ? JSON.stringify(data.context) : null,
      actions: data.actions ? JSON.stringify(data.actions) : null,
      timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp,
      channels_sent: JSON.stringify(data.channels_sent || []),
      status: data.status,
      created_at: new Date().toISOString(),
    });

    // Return the inserted record
    return this.findOne(table, { id: result.lastInsertRowid });
  }

  async query(table: string, filters: EventFilters): Promise<PaginatedResult<EventRecord>> {
    if (table !== 'events') {
      throw new Error(`Table ${table} not supported`);
    }

    const conditions: string[] = [];
    const params: any = {};

    if (filters.source) {
      conditions.push('source = @source');
      params.source = filters.source;
    }

    if (filters.event_type) {
      conditions.push('event_type = @event_type');
      params.event_type = filters.event_type;
    }

    if (filters.severity) {
      conditions.push('severity = @severity');
      params.severity = filters.severity;
    }

    if (filters.timestamp_gte) {
      conditions.push('timestamp >= @timestamp_gte');
      params.timestamp_gte = filters.timestamp_gte;
    }

    if (filters.timestamp_lt) {
      conditions.push('timestamp < @timestamp_lt');
      params.timestamp_lt = filters.timestamp_lt;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM events ${whereClause}`);
    const { count } = countStmt.get(params) as { count: number };

    // Query with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const queryStmt = this.db.prepare(`
      SELECT * FROM events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT @limit OFFSET @offset
    `);

    const rows = queryStmt.all({
      ...params,
      limit,
      offset,
    }) as any[];

    const items = rows.map(this.rowToEventRecord);

    return {
      total: count,
      items,
      limit,
      offset,
    };
  }

  async findOne(table: string, criteria: any): Promise<any | null> {
    if (table !== 'events') {
      throw new Error(`Table ${table} not supported`);
    }

    const conditions: string[] = [];
    const params: any = {};

    for (const [key, value] of Object.entries(criteria)) {
      conditions.push(`${key} = @${key}`);
      params[key] = value;
    }

    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `);

    const row = stmt.get(params);

    return row ? this.rowToEventRecord(row) : null;
  }

  async update(table: string, criteria: any, data: any): Promise<void> {
    if (table !== 'events') {
      throw new Error(`Table ${table} not supported`);
    }

    const setClauses: string[] = [];
    const params: any = {};

    for (const [key, value] of Object.entries(data)) {
      setClauses.push(`${key} = @${key}`);
      params[key] = value;
    }

    const conditions: string[] = [];
    for (const [key, value] of Object.entries(criteria)) {
      conditions.push(`${key} = @where_${key}`);
      params[`where_${key}`] = value;
    }

    const stmt = this.db.prepare(`
      UPDATE events
      SET ${setClauses.join(', ')}
      WHERE ${conditions.join(' AND ')}
    `);

    stmt.run(params);
  }

  async delete(table: string, criteria: any): Promise<void> {
    if (table !== 'events') {
      throw new Error(`Table ${table} not supported`);
    }

    const conditions: string[] = [];
    const params: any = {};

    for (const [key, value] of Object.entries(criteria)) {
      conditions.push(`${key} = @${key}`);
      params[key] = value;
    }

    const stmt = this.db.prepare(`
      DELETE FROM events
      WHERE ${conditions.join(' AND ')}
    `);

    stmt.run(params);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  /**
   * Convert database row to EventRecord
   */
  private rowToEventRecord(row: any): EventRecord {
    return {
      id: row.id,
      trace_id: row.trace_id,
      source: row.source,
      event_type: row.event_type,
      severity: row.severity,
      title: row.title,
      summary: row.summary,
      context: row.context ? JSON.parse(row.context) : undefined,
      actions: row.actions ? JSON.parse(row.actions) : undefined,
      timestamp: new Date(row.timestamp),
      channels_sent: JSON.parse(row.channels_sent),
      status: row.status,
      created_at: new Date(row.created_at),
    };
  }
}
