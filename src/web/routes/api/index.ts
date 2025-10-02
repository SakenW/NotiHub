/**
 * API Routes - REST API endpoints
 */

import { FastifyPluginAsync } from 'fastify';
import { EventStore } from '../../../application/event-store.js';
import { NotificationService } from '../../../application/notification-service.js';
import { AppConfig } from '../../../domain/types.js';

interface ApiOptions {
  config: AppConfig;
  eventStore?: EventStore;
  notificationService: NotificationService;
}

export const apiRoutes: FastifyPluginAsync<ApiOptions> = async (app, opts) => {
  const { config, eventStore, notificationService } = opts;

  // Auth middleware
  app.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const expectedToken = config.server.auth.token;

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Get events
  app.get('/events', async (request, reply) => {
    if (!eventStore) {
      return reply.code(501).send({ error: 'Event storage not enabled' });
    }

    const query = request.query as any;

    const filters = {
      source: query.source,
      event_type: query.type,
      severity: query.severity,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    };

    const result = await eventStore.query(filters);

    return result;
  });

  // Get single event
  app.get('/events/:id', async (request, reply) => {
    if (!eventStore) {
      return reply.code(501).send({ error: 'Event storage not enabled' });
    }

    const { id } = request.params as { id: string };
    const event = await eventStore.getById(parseInt(id));

    if (!event) {
      return reply.code(404).send({ error: 'Event not found' });
    }

    return event;
  });

  // Get statistics
  app.get('/stats', async (_request, reply) => {
    if (!eventStore) {
      return reply.code(501).send({ error: 'Event storage not enabled' });
    }

    // Get today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEvents = await eventStore.query({
      timestamp_gte: today.toISOString(),
    });

    const total = todayEvents.total;
    const success = todayEvents.items.filter(e => e.status === 'success').length;
    const failed = todayEvents.items.filter(e => e.status === 'failed').length;
    const partial = todayEvents.items.filter(e => e.status === 'partial').length;

    return {
      today: {
        total,
        success,
        failed,
        partial,
        success_rate: total > 0 ? ((success / total) * 100).toFixed(2) : '0',
      },
      channels: await notificationService.getChannelStatuses(),
    };
  });

  // Get config
  app.get('/config', async () => {
    // Return safe config (no secrets)
    return {
      version: config.version,
      server: {
        mode: config.server.mode,
        port: config.server.port,
      },
      inputs: Object.keys(config.inputs).reduce((acc, key) => {
        acc[key] = {
          enabled: config.inputs[key].enabled,
        };
        return acc;
      }, {} as any),
      channels: Object.keys(config.channels).reduce((acc, key) => {
        acc[key] = {
          enabled: config.channels[key].enabled,
          type: config.channels[key].type,
        };
        return acc;
      }, {} as any),
      policies: config.policies,
    };
  });

  // Test channel
  app.post('/channels/:name/test', async (request, reply) => {
    const { name } = request.params as { name: string };

    try {
      const result = await notificationService.testChannel(name);
      return { success: result, channel: name };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // API documentation
  app.get('/docs', async () => {
    return {
      name: 'NotiHub API',
      version: '0.1.0',
      endpoints: {
        events: {
          'GET /api/events': 'List events with pagination',
          'GET /api/events/:id': 'Get single event',
        },
        stats: {
          'GET /api/stats': 'Get statistics',
        },
        config: {
          'GET /api/config': 'Get configuration',
        },
        channels: {
          'POST /api/channels/:name/test': 'Test channel connectivity',
        },
      },
      authentication: 'Bearer token in Authorization header',
    };
  });
};
