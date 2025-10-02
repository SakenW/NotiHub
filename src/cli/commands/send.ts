/**
 * Send Command - Send a notification
 */

import { readFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { EventModel } from '../../domain/event.js';
import { Event, EventType, Severity } from '../../domain/types.js';
import { ConfigManager } from '../../application/config-manager.js';
import { NotificationService } from '../../application/notification-service.js';
import { DeduplicationService } from '../../application/deduplication-service.js';
import { RetryPolicy } from '../../application/retry-policy.js';
import { MemoryCache } from '../../infrastructure/cache/memory-cache.js';
import { FeishuChannel } from '../../adapters/output/feishu/feishu-channel.js';

interface SendOptions {
  file?: string;
  source?: string;
  type?: EventType;
  severity?: Severity;
  title?: string;
  summary?: string;
}

export async function sendCommand(options: SendOptions): Promise<void> {
  try {
    // Load configuration
    const config = ConfigManager.load();

    // Parse event
    let event: Event;

    if (options.file) {
      // Read from file
      const content = readFileSync(options.file, 'utf-8');
      const data = JSON.parse(content);
      event = new EventModel(data);
    } else if (process.stdin.isTTY === false) {
      // Read from stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString('utf-8');
      const data = JSON.parse(content);
      event = new EventModel(data);
    } else if (options.source && options.title) {
      // Create from CLI arguments
      event = new EventModel({
        source: options.source,
        event_type: options.type || 'info',
        severity: options.severity || 'low',
        title: options.title,
        summary: options.summary || '',
      });
    } else {
      console.error(chalk.red('\n❌ Error: No event data provided\n'));
      console.log(chalk.gray('Usage:'));
      console.log(chalk.cyan('  notihub send -f event.json'));
      console.log(chalk.cyan('  echo \'{"source":"test",...}\' | notihub send'));
      console.log(chalk.cyan('  notihub send --source=test --title="Title" --summary="Summary"\n'));
      process.exit(1);
    }

    // Validate event (if using EventModel)
    if (event instanceof EventModel && !event.validate()) {
      console.error(chalk.red('\n❌ Error: Invalid event data\n'));
      console.log(chalk.gray('Required fields: source, title\n'));
      process.exit(1);
    }

    // Basic validation for plain Event objects
    if (!event.source || !event.title) {
      console.error(chalk.red('\n❌ Error: Invalid event data\n'));
      console.log(chalk.gray('Required fields: source, title\n'));
      process.exit(1);
    }

    // Initialize channels
    const channels = [];

    if (config.channels.feishu?.enabled && config.channels.feishu.webhook) {
      channels.push(new FeishuChannel({
        webhook: config.channels.feishu.webhook as string,
        secret: config.channels.feishu.secret as string | undefined,
        sign: config.channels.feishu.sign as boolean | undefined,
      }));
    }

    if (channels.length === 0) {
      console.error(chalk.yellow('\n⚠️  Warning: No channels enabled\n'));
      console.log(chalk.gray('Run "notihub init" to configure channels\n'));
      process.exit(1);
    }

    // Initialize services
    const cache = new MemoryCache({ ttl: config.policies.deduplication?.ttl || 60 });
    const dedupService = new DeduplicationService(
      cache,
      config.policies.deduplication?.ttl || 60
    );
    const retryPolicy = new RetryPolicy({
      maxAttempts: config.policies.retry?.max_attempts || 3,
      backoff: config.policies.retry?.backoff || [1, 4, 10],
    });

    const notificationService = new NotificationService(
      channels,
      dedupService,
      retryPolicy
    );

    // Send notification
    const spinner = ora('Sending notification...').start();

    try {
      const results = await notificationService.notify(event);

      const successCount = results.filter((r) => r.success).length;

      if (successCount === results.length) {
        spinner.succeed(chalk.green(`Sent successfully to ${successCount} channel(s)`));
      } else if (successCount > 0) {
        spinner.warn(chalk.yellow(`Sent to ${successCount}/${results.length} channel(s)`));
      } else {
        spinner.fail(chalk.red('Failed to send to all channels'));
      }

      // Show results
      console.log('');
      for (const result of results) {
        if (result.success) {
          console.log(chalk.green(`  ✓ ${result.channel}`));
        } else {
          console.log(chalk.red(`  ✗ ${result.channel}: ${result.error}`));
        }
      }
      console.log('');

      // Show event info
      console.log(chalk.gray('Event details:'));
      console.log(chalk.cyan(`  Trace ID: ${event.trace_id}`));
      console.log(chalk.cyan(`  Source: ${event.source}`));
      console.log(chalk.cyan(`  Type: ${event.event_type}`));
      console.log('');

    } catch (error: any) {
      spinner.fail('Failed to send notification');
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}
