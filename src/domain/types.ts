/**
 * Core type definitions for NotiHub
 */

export type EventType = 'success' | 'error' | 'warning' | 'info';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ChannelType = 'webhook' | 'mcp' | 'api' | 'email';

export interface Action {
  type: 'link' | 'postback';
  text: string;
  url?: string;
  callback?: string;
  metadata?: Record<string, any>;
}

export interface Event {
  source: string;
  event_type: EventType;
  severity: Severity;
  title: string;
  summary: string;
  context?: Record<string, any>;
  actions?: Action[];
  trace_id: string;
  timestamp: Date;
}

export interface SendResult {
  success: boolean;
  channel: string;
  message_id?: string;
  error?: string;
  timestamp?: Date;
}

export interface EventRecord extends Event {
  id: number;
  channels_sent: string[];
  status: 'success' | 'partial' | 'failed';
  created_at: Date;
}

export interface ChannelConfig {
  enabled: boolean;
  type: ChannelType;
  [key: string]: any;
}

export interface InputConfig {
  enabled: boolean;
  webhook_path?: string;
  [key: string]: any;
}

export interface PolicyConfig {
  deduplication?: {
    enabled: boolean;
    ttl: number;
  };
  rate_limit?: {
    enabled: boolean;
    max_per_minute: number;
  };
  retry?: {
    enabled: boolean;
    max_attempts: number;
    backoff: number[];
  };
}

export interface AppConfig {
  version: string;
  server: {
    enabled: boolean;
    port: number;
    host: string;
    mode: 'local' | 'cloud';
    auth: {
      token: string;
      secret?: string;
    };
  };
  database?: {
    type: 'sqlite' | 'postgres' | 'mysql';
    path?: string;
    url?: string;
  };
  inputs: Record<string, InputConfig>;
  channels: Record<string, ChannelConfig>;
  policies: PolicyConfig;
}

export interface DashboardStats {
  today: {
    total: number;
    success: number;
    error: number;
    warning: number;
    success_rate: string;
  };
  trend: TrendPoint[];
  channels: Record<string, ChannelStatus>;
}

export interface TrendPoint {
  time: string;
  success: number;
  error: number;
  warning: number;
}

export interface ChannelStatus {
  status: 'healthy' | 'degraded' | 'offline';
  last_send?: string;
  error?: string;
}

export interface PaginatedResult<T> {
  total: number;
  items: T[];
  limit: number;
  offset: number;
}

export interface EventFilters {
  source?: string;
  event_type?: EventType;
  severity?: Severity;
  timestamp_gte?: string;
  timestamp_lt?: string;
  limit?: number;
  offset?: number;
}
