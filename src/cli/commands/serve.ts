/**
 * Serve Command - Start HTTP server
 */

import chalk from 'chalk';
import { ConfigManager } from '../../application/config-manager.js';
import { NotificationService } from '../../application/notification-service.js';
import { DeduplicationService } from '../../application/deduplication-service.js';
import { RetryPolicy } from '../../application/retry-policy.js';
import { EventStore } from '../../application/event-store.js';
import { MemoryCache } from '../../infrastructure/cache/memory-cache.js';
import { SQLiteStorage } from '../../infrastructure/storage/sqlite-storage.js';
import { WebServer } from '../../web/server.js';
import { FeishuChannel } from '../../adapters/output/feishu/feishu-channel.js';
import { join } from 'path';

interface ServeOptions {
  port?: number;
  host?: string;
  cloud?: boolean;
  daemon?: boolean;
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  try {
    console.log(chalk.bold.cyan('\n🚀 Starting NotiHub Server\n'));

    // Load configuration
    const config = ConfigManager.load();

    // Override with CLI options
    if (options.port) {
      config.server.port = options.port;
    }
    if (options.host) {
      config.server.host = options.host;
    }
    if (options.cloud) {
      config.server.mode = 'cloud';
    }

    // Initialize storage
    const dbPath = config.database?.path || join(ConfigManager.getConfigDir(), 'data.db');
    const storage = new SQLiteStorage(dbPath);
    await storage.init();
    console.log(chalk.gray(`✓ Database initialized: ${dbPath}`));

    // Initialize event store
    const eventStore = new EventStore(storage);

    // Initialize channels
    const channels = [];

    if (config.channels.feishu?.enabled && config.channels.feishu.webhook) {
      channels.push(new FeishuChannel({
        webhook: config.channels.feishu.webhook as string,
        secret: config.channels.feishu.secret as string | undefined,
        sign: config.channels.feishu.sign as boolean | undefined,
      }));
      console.log(chalk.gray('✓ Feishu channel enabled'));
    }

    if (channels.length === 0) {
      console.log(chalk.yellow('⚠️  Warning: No channels enabled'));
    } else {
      console.log(chalk.gray(`✓ ${channels.length} channel(s) enabled\n`));
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
      retryPolicy,
      eventStore
    );

    // Start web server
    const server = new WebServer(config, notificationService, eventStore);

    await server.start(config.server.port, config.server.host);

    console.log('');
    console.log(chalk.green('✅ Server started successfully!\n'));
    console.log(chalk.gray('Auth token (for API requests):'));
    console.log(chalk.yellow(`   ${config.server.auth.token}\n`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n⏹  Shutting down server...'));
      await server.stop();
      await storage.close();
      console.log(chalk.gray('✓ Server stopped\n'));
      process.exit(0);
    });

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    console.error(error.stack);
    process.exit(1);
  }
}
