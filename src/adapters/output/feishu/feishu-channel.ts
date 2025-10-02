/**
 * Feishu (Lark) Webhook Channel
 */

import axios from 'axios';
import { BaseChannel } from '../base/channel.interface.js';
import { Event, SendResult, ChannelType } from '../../../domain/types.js';
import { FeishuCardBuilder } from './feishu-card-builder.js';
import { FeishuSigner } from './feishu-signer.js';

export interface FeishuConfig {
  webhook: string;
  secret?: string;
  sign?: boolean;
}

export class FeishuChannel extends BaseChannel {
  readonly name = 'feishu';
  readonly type: ChannelType = 'webhook';

  constructor(protected config: FeishuConfig) {
    super(config);
  }

  async send(event: Event): Promise<SendResult> {
    try {
      const card = new FeishuCardBuilder(event).build();

      let payload: any = {
        msg_type: 'interactive',
        card,
      };

      // Add signature if enabled
      if (this.config.sign && this.config.secret) {
        const signer = new FeishuSigner(this.config.secret);
        const { timestamp, sign } = signer.generateSignature();
        payload.timestamp = timestamp;
        payload.sign = sign;
      }

      const response = await axios.post(this.config.webhook, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      if (response.data.code === 0) {
        return {
          success: true,
          channel: this.name,
          message_id: response.data.data?.message_id,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          channel: this.name,
          error: response.data.msg || 'Unknown error',
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      // Fallback to plain text
      if (error.response?.status === 400) {
        return this.sendPlainText(event);
      }
      return this.handleError(error, this.name);
    }
  }

  /**
   * Fallback to plain text message
   */
  private async sendPlainText(event: Event): Promise<SendResult> {
    try {
      const payload = {
        msg_type: 'text',
        content: {
          text: `[${event.severity.toUpperCase()}] ${event.title}\n\n${event.summary}`,
        },
      };

      const response = await axios.post(this.config.webhook, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        success: response.data.code === 0,
        channel: this.name,
        error: response.data.msg,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return this.handleError(error, this.name);
    }
  }

  getConfigSchema(): object {
    return {
      type: 'object',
      required: ['webhook'],
      properties: {
        webhook: {
          type: 'string',
          format: 'uri',
          description: 'Feishu webhook URL',
        },
        secret: {
          type: 'string',
          description: 'Webhook secret for signature verification',
        },
        sign: {
          type: 'boolean',
          default: false,
          description: 'Enable signature verification',
        },
      },
    };
  }
}
