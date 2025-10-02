/**
 * Claude Code Input Adapter
 */

import { BaseInputAdapter } from '../base/input-adapter.interface.js';
import { Event, EventType, Severity } from '../../../domain/types.js';

export interface ClaudeCodeHookPayload {
  hook_type: 'task_start' | 'task_complete' | 'task_error' | 'plan_created';
  task_id: string;
  task_name: string;
  status: 'success' | 'error' | 'running';
  duration?: number;
  summary?: string;
  files_changed?: string[];
  tool_calls?: number;
  workspace: string;
  timestamp: string;
}

export class ClaudeCodeAdapter extends BaseInputAdapter {
  readonly name = 'claude-code';
  readonly version = '1.0.0';

  async parse(rawInput: unknown): Promise<Event> {
    const data = rawInput as ClaudeCodeHookPayload;

    return this.createEvent({
      source: 'claude-code',
      event_type: this.mapEventType(data.hook_type, data.status),
      severity: this.mapSeverity(data.status),
      title: this.buildTitle(data),
      summary: this.buildSummary(data),
      context: {
        task_name: data.task_name,
        duration: data.duration,
        files_changed: data.files_changed,
        tool_calls: data.tool_calls,
        workspace: data.workspace,
      },
      actions: this.buildActions(data),
      trace_id: data.task_id,
      timestamp: new Date(data.timestamp),
    });
  }

  validate(rawInput: unknown): boolean {
    const data = rawInput as any;
    return !!(
      data &&
      data.hook_type &&
      data.task_id &&
      data.task_name &&
      data.workspace
    );
  }

  getConfigSchema(): object {
    return {
      type: 'object',
      properties: {
        task_filter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter tasks by name pattern',
          default: [],
        },
        include_tool_calls: {
          type: 'boolean',
          description: 'Include tool call count in context',
          default: true,
        },
      },
    };
  }

  private mapEventType(
    hookType: string,
    status: string
  ): EventType {
    if (status === 'error') return 'error';
    if (hookType === 'task_complete' && status === 'success') return 'success';
    if (hookType === 'task_start') return 'info';
    return 'info';
  }

  private mapSeverity(status: string): Severity {
    const map: Record<string, Severity> = {
      error: 'high',
      success: 'low',
      running: 'low',
    };
    return map[status] || 'low';
  }

  private buildTitle(data: ClaudeCodeHookPayload): string {
    const statusEmoji = {
      success: '✅',
      error: '❌',
      running: '⏳',
    };

    const emoji = statusEmoji[data.status] || 'ℹ️';
    return `${emoji} Task ${data.status}: ${data.task_name}`;
  }

  private buildSummary(data: ClaudeCodeHookPayload): string {
    if (data.summary) return data.summary;

    const parts: string[] = [];

    if (data.duration) {
      parts.push(`Duration: ${data.duration}s`);
    }

    if (data.files_changed && data.files_changed.length > 0) {
      parts.push(`Files changed: ${data.files_changed.length}`);
    }

    if (data.tool_calls) {
      parts.push(`Tool calls: ${data.tool_calls}`);
    }

    return parts.join(' | ') || 'Task completed';
  }

  private buildActions(data: ClaudeCodeHookPayload): any[] {
    return [
      {
        type: 'link',
        text: 'View in Claude Code',
        url: `vscode://anthropics.claude-code?task=${data.task_id}`,
      },
    ];
  }
}
