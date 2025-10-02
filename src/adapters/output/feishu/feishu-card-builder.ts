/**
 * Feishu Card Builder - Constructs interactive cards
 */

import { Event } from '../../../domain/types.js';

export class FeishuCardBuilder {
  constructor(private event: Event) {}

  build(): object {
    return {
      config: {
        wide_screen_mode: true,
      },
      header: this.buildHeader(),
      elements: this.buildElements(),
    };
  }

  private buildHeader(): object {
    const colorMap = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'blue',
    };

    const eventTypeEmoji = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    return {
      template: colorMap[this.event.severity] || 'blue',
      title: {
        content: `${eventTypeEmoji[this.event.event_type]} ${this.event.title}`,
        tag: 'plain_text',
      },
    };
  }

  private buildElements(): any[] {
    const elements: any[] = [];

    // Summary
    elements.push({
      tag: 'div',
      text: {
        content: this.event.summary,
        tag: 'lark_md',
      },
    });

    // Context fields
    if (this.event.context && Object.keys(this.event.context).length > 0) {
      const fields: any[] = [];

      for (const [key, value] of Object.entries(this.event.context)) {
        fields.push({
          is_short: true,
          text: {
            content: `**${key}**\n${this.formatValue(value)}`,
            tag: 'lark_md',
          },
        });
      }

      elements.push({
        tag: 'div',
        fields,
      });
    }

    // Divider
    elements.push({ tag: 'hr' });

    // Metadata
    elements.push({
      tag: 'div',
      text: {
        content: `**Source:** ${this.event.source} | **Time:** ${this.formatTimestamp(this.event.timestamp)} | **Trace ID:** \`${this.event.trace_id}\``,
        tag: 'lark_md',
      },
    });

    // Actions
    if (this.event.actions && this.event.actions.length > 0) {
      const actions = this.event.actions.map((action) => ({
        tag: 'button',
        text: {
          content: action.text,
          tag: 'plain_text',
        },
        type: action.type === 'link' ? 'default' : 'primary',
        url: action.url,
        value: action.callback ? JSON.stringify({ callback: action.callback }) : undefined,
      }));

      elements.push({
        tag: 'action',
        actions,
      });
    }

    return elements;
  }

  private formatValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  private formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
    });
  }
}
