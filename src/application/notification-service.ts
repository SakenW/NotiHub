/**
 * Notification Service - Core business logic
 */

import { Event, SendResult } from '../domain/types.js';
import { Channel } from '../adapters/output/base/channel.interface.js';
import { DeduplicationService } from './deduplication-service.js';
import { RetryPolicy } from './retry-policy.js';
import { EventStore } from './event-store.js';

export class NotificationService {
  constructor(
    private channels: Channel[],
    private deduplicationService: DeduplicationService,
    private retryPolicy: RetryPolicy,
    private eventStore?: EventStore
  ) {}

  /**
   * Send notification to all enabled channels
   */
  async notify(event: Event): Promise<SendResult[]> {
    // 1. Check deduplication
    if (this.deduplicationService.isDuplicate(event)) {
      console.log(`[Dedup] Skipping duplicate event: ${event.trace_id}`);
      return [];
    }

    // 2. Send to all channels with retry
    const results: SendResult[] = [];

    for (const channel of this.channels) {
      try {
        const result = await this.retryPolicy.execute(
          () => channel.send(event),
          channel.name
        );
        results.push(result);

        if (result.success) {
          console.log(`[${channel.name}] Sent successfully:`, event.trace_id);
        } else {
          console.error(`[${channel.name}] Failed:`, result.error);
        }
      } catch (error: any) {
        console.error(`[${channel.name}] Error:`, error.message);
        results.push({
          success: false,
          channel: channel.name,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }

    // 3. Store event (async, non-blocking)
    if (this.eventStore) {
      setImmediate(() => {
        this.eventStore!.save(event, results).catch((err) => {
          console.error('[EventStore] Failed to save:', err);
        });
      });
    }

    return results;
  }

  /**
   * Send to specific channels
   */
  async notifyChannels(
    event: Event,
    channelNames: string[]
  ): Promise<SendResult[]> {
    const targetChannels = this.channels.filter((ch) =>
      channelNames.includes(ch.name)
    );

    if (targetChannels.length === 0) {
      throw new Error(`No matching channels found: ${channelNames.join(', ')}`);
    }

    const results: SendResult[] = [];

    for (const channel of targetChannels) {
      const result = await this.retryPolicy.execute(
        () => channel.send(event),
        channel.name
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Test channel connectivity
   */
  async testChannel(channelName: string): Promise<boolean> {
    const channel = this.channels.find((ch) => ch.name === channelName);

    if (!channel) {
      throw new Error(`Channel not found: ${channelName}`);
    }

    return channel.healthCheck();
  }

  /**
   * Get all channel statuses
   */
  async getChannelStatuses(): Promise<
    Record<string, { healthy: boolean; error?: string }>
  > {
    const statuses: Record<string, { healthy: boolean; error?: string }> = {};

    await Promise.all(
      this.channels.map(async (channel) => {
        try {
          const healthy = await channel.healthCheck();
          statuses[channel.name] = { healthy };
        } catch (error: any) {
          statuses[channel.name] = {
            healthy: false,
            error: error.message,
          };
        }
      })
    );

    return statuses;
  }
}
