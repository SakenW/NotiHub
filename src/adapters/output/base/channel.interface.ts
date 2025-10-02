/**
 * Channel interface - Output adapter contract
 */

import { Event, SendResult, EventType, ChannelType } from '../../../domain/types.js';

export interface ChannelContext {
  retryCount?: number;
  originalError?: Error;
  metadata?: Record<string, any>;
}

export interface Channel {
  /**
   * Channel name (e.g., 'feishu', 'slack', 'dingtalk')
   */
  readonly name: string;

  /**
   * Channel type
   */
  readonly type: ChannelType;

  /**
   * Send notification to this channel
   */
  send(event: Event, context?: ChannelContext): Promise<SendResult>;

  /**
   * Health check - verify channel connectivity
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get supported event types for this channel
   */
  getSupportedEventTypes(): EventType[];

  /**
   * Get channel configuration schema
   */
  getConfigSchema(): object;
}

export abstract class BaseChannel implements Channel {
  abstract name: string;
  abstract type: ChannelType;

  constructor(protected config: any) {}

  abstract send(event: Event, context?: ChannelContext): Promise<SendResult>;

  async healthCheck(): Promise<boolean> {
    try {
      // Default implementation - try to send a test event
      const testEvent: Event = {
        source: 'notihub-health-check',
        event_type: 'info',
        severity: 'low',
        title: 'Health Check',
        summary: 'Testing channel connectivity',
        trace_id: 'health-check',
        timestamp: new Date(),
      };
      const result = await this.send(testEvent);
      return result.success;
    } catch {
      return false;
    }
  }

  getSupportedEventTypes(): EventType[] {
    return ['success', 'error', 'warning', 'info'];
  }

  abstract getConfigSchema(): object;

  /**
   * Helper method to handle errors
   */
  protected handleError(error: any, channel: string): SendResult {
    return {
      success: false,
      channel,
      error: error.message || 'Unknown error',
      timestamp: new Date(),
    };
  }
}
