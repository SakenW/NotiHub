/**
 * Web Server - HTTP API and Dashboard
 */

import Fastify, { FastifyInstance } from 'fastify';
import { AppConfig } from '../domain/types.js';
import { NotificationService } from '../application/notification-service.js';
import { EventStore } from '../application/event-store.js';
import { apiRoutes } from './routes/api/index.js';
import { webhookRoutes } from './routes/webhooks/index.js';

export class WebServer {
  private app: FastifyInstance;

  constructor(
    private config: AppConfig,
    private notificationService: NotificationService,
    private eventStore?: EventStore
  ) {
    this.app = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
      },
    });
  }

  async start(port?: number, host?: string): Promise<void> {
    const serverPort = port || this.config.server.port || 3000;
    const serverHost = host || this.config.server.host || '0.0.0.0';

    // Register routes
    await this.registerRoutes();

    // Start server
    try {
      await this.app.listen({ port: serverPort, host: serverHost });
      console.log(`🚀 Server running at http://${serverHost}:${serverPort}`);
      console.log(`📊 API: http://${serverHost}:${serverPort}/api`);
      console.log(`🔗 Webhooks: http://${serverHost}:${serverPort}/webhooks`);
    } catch (err) {
      this.app.log.error(err);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    await this.app.close();
  }

  private async registerRoutes(): Promise<void> {
    // Health check
    this.app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // API routes
    await this.app.register(apiRoutes, {
      prefix: '/api',
      config: this.config,
      eventStore: this.eventStore,
      notificationService: this.notificationService,
    });

    // Webhook routes
    await this.app.register(webhookRoutes, {
      prefix: '/webhooks',
      config: this.config,
      notificationService: this.notificationService,
    });

    // Root endpoint
    this.app.get('/', async () => {
      return {
        name: 'NotiHub',
        version: '0.1.0',
        endpoints: {
          health: '/health',
          api: '/api',
          webhooks: '/webhooks',
          docs: '/api/docs',
        },
      };
    });
  }

  getApp(): FastifyInstance {
    return this.app;
  }
}
