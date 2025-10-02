/**
 * Webhook Routes - Receive notifications
 */

import { FastifyPluginAsync } from 'fastify';
import { EventModel } from '../../../domain/event.js';
import { NotificationService } from '../../../application/notification-service.js';
import { AppConfig } from '../../../domain/types.js';

interface WebhookOptions {
  config: AppConfig;
  notificationService: NotificationService;
}

export const webhookRoutes: FastifyPluginAsync<WebhookOptions> = async (app, opts) => {
  const { config, notificationService } = opts;

  // Generic webhook endpoint
  app.post('/notify', {
    schema: {
      body: {
        type: 'object',
        required: ['source', 'title'],
        properties: {
          source: { type: 'string' },
          event_type: { type: 'string' },
          severity: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          context: { type: 'object' },
          actions: { type: 'array' },
          trace_id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Check auth token
      const authHeader = request.headers.authorization;
      const expectedToken = config.server.auth.token;

      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Parse event
      const event = new EventModel(request.body as any);

      // Validate
      if (!event.validate()) {
        return reply.code(400).send({ error: 'Invalid event data' });
      }

      // Send notification
      const results = await notificationService.notify(event);

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        trace_id: event.trace_id,
        results,
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // Claude Code webhook
  app.post('/claude-code', async (_request, reply) => {
    try {
      // TODO: Implement Claude Code adapter parsing
      return reply.code(501).send({ error: 'Not implemented yet' });
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // GitHub webhook
  app.post('/github', async (_request, reply) => {
    try {
      // TODO: Implement GitHub webhook verification and parsing
      return reply.code(501).send({ error: 'Not implemented yet' });
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // n8n webhook
  app.post('/n8n', async (request, reply) => {
    try {
      // n8n can send any JSON, just forward to notify
      const event = new EventModel({
        ...request.body as any,
        source: 'n8n',
      });

      if (!event.validate()) {
        return reply.code(400).send({ error: 'Invalid event data' });
      }

      const results = await notificationService.notify(event);

      return {
        success: results.some(r => r.success),
        trace_id: event.trace_id,
        results,
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });
};
