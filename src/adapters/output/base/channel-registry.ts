/**
 * Channel Registry - Manages all output channels
 */

import { Channel } from './channel.interface.js';
import { AppConfig } from '../../../domain/types.js';

export class ChannelRegistry {
  private static channels = new Map<string, Channel>();

  /**
   * Register a channel
   */
  static register(channel: Channel): void {
    this.channels.set(channel.name, channel);
  }

  /**
   * Get channel by name
   */
  static get(name: string): Channel | undefined {
    return this.channels.get(name);
  }

  /**
   * Get all registered channels
   */
  static getAll(): Channel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get enabled channels based on config
   */
  static getEnabled(config: AppConfig): Channel[] {
    const enabled: Channel[] = [];

    for (const [name, channelConfig] of Object.entries(config.channels)) {
      if (channelConfig.enabled) {
        const channel = this.get(name);
        if (channel) {
          enabled.push(channel);
        }
      }
    }

    return enabled;
  }

  /**
   * Clear all registered channels
   */
  static clear(): void {
    this.channels.clear();
  }

  /**
   * Check if channel exists
   */
  static has(name: string): boolean {
    return this.channels.has(name);
  }

  /**
   * Get channel names
   */
  static getNames(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Initialize channels from config
   * This should be called after all channel implementations are loaded
   */
  static async init(_config: AppConfig): Promise<void> {
    // Channels will be registered by their respective modules
    // This method can perform additional initialization if needed
    console.log(`Initialized ${this.channels.size} channels`);
  }
}
