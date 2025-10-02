# NotiHub Architecture

## Overview

NotiHub follows **Hexagonal Architecture** (Ports & Adapters) principles, ensuring clean separation between business logic and external integrations.

## Core Principles

1. **Dependency Inversion** - Core domain does not depend on external implementations
2. **Port-Adapter Pattern** - Inputs and outputs are decoupled via interfaces
3. **Configuration-Driven** - Enable/disable features without code changes
4. **Extensibility** - Add new adapters without modifying core logic

## Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Presentation Layer                   │
│            (CLI Commands, Web Routes)                │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│                 Input Adapters                       │
│  (Transform external data → Event model)            │
├─────────────────────────────────────────────────────┤
│  • CLI Input       • HTTP API      • Claude Code    │
│  • GitHub Webhook  • n8n           • Custom         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              Application Services                    │
│           (Business Logic & Orchestration)          │
├─────────────────────────────────────────────────────┤
│  • NotificationService  - Core orchestration        │
│  • DeduplicationService - Duplicate detection       │
│  • RetryPolicy          - Error handling            │
│  • EventStore           - Persistence               │
│  • StatsCollector       - Metrics aggregation       │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│                 Domain Layer                         │
│              (Pure Business Logic)                   │
├─────────────────────────────────────────────────────┤
│  • Event Model          - Core event structure      │
│  • Channel Interface    - Output contract           │
│  • Policy Models        - Dedup/Retry rules         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│                Output Adapters                       │
│         (Transform Event → Channel format)          │
├─────────────────────────────────────────────────────┤
│  • Feishu      • Slack       • DingTalk             │
│  • Telegram    • Email       • Generic Webhook      │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│                Infrastructure                        │
│         (Storage, Cache, External Services)         │
├─────────────────────────────────────────────────────┤
│  • SQLite/Postgres Storage                          │
│  • LRU Memory Cache                                 │
│  • SSE Manager                                      │
│  • Logger                                           │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Sending a Notification

```
1. Input Source (e.g., CLI, HTTP, Claude Code Hook)
   └─> Input Adapter parses raw data
       └─> Generates standardized Event
           └─> NotificationService receives Event
               ├─> Check deduplication (skip if duplicate)
               ├─> Iterate enabled channels
               │   └─> For each channel:
               │       ├─> Build channel-specific payload
               │       ├─> Apply retry policy
               │       └─> Send via HTTP/MCP/API
               └─> Store event + results in EventStore
                   └─> Emit SSE event for Dashboard
```

### Example Flow: Claude Code → Feishu

```typescript
// 1. Claude Code Hook triggers
{
  hook_type: 'task_complete',
  task_id: 'abc-123',
  task_name: 'Refactor auth module',
  status: 'success',
  duration: 45
}

// 2. ClaudeCodeAdapter transforms
Event {
  source: 'claude-code',
  event_type: 'success',
  severity: 'low',
  title: '✅ Task success: Refactor auth module',
  summary: 'Duration: 45s',
  trace_id: 'abc-123',
  timestamp: Date
}

// 3. NotificationService processes
- Check deduplication (new trace_id → proceed)
- Get enabled channels: [feishu, slack]

// 4. FeishuChannel sends
- Build interactive card with FeishuCardBuilder
- Add signature if enabled
- POST to webhook URL
- Return SendResult { success: true }

// 5. EventStore persists
- Save event + results to SQLite
- Emit 'event:created' for SSE
```

## Component Details

### Input Adapters

**Contract**: `InputAdapter`

```typescript
interface InputAdapter {
  name: string;
  version: string;
  parse(rawInput: unknown): Promise<Event | Event[]>;
  validate(rawInput: unknown): boolean;
  getConfigSchema(): object;
}
```

**Registration**: Dynamically registered in `InputRegistry`

**Extensibility**: Add new adapter → Implement interface → Register

### Output Channels

**Contract**: `Channel`

```typescript
interface Channel {
  name: string;
  type: ChannelType;
  send(event: Event, context?: ChannelContext): Promise<SendResult>;
  healthCheck(): Promise<boolean>;
  getSupportedEventTypes(): EventType[];
  getConfigSchema(): object;
}
```

**Registration**: Dynamically registered in `ChannelRegistry`

**Extensibility**: Add new channel → Implement interface → Register

### Application Services

#### NotificationService

- **Responsibility**: Orchestrate notification sending
- **Dependencies**: Channels, DeduplicationService, RetryPolicy, EventStore
- **Key Methods**:
  - `notify(event)` - Send to all channels
  - `notifyChannels(event, channelNames)` - Send to specific channels
  - `testChannel(name)` - Health check

#### DeduplicationService

- **Responsibility**: Prevent duplicate notifications
- **Key Logic**: Cache `trace_id + event_type` for TTL seconds
- **Storage**: In-memory LRU cache

#### RetryPolicy

- **Responsibility**: Handle transient failures
- **Strategy**: Exponential backoff (1s, 4s, 10s)
- **Max Attempts**: Configurable (default: 3)

#### EventStore

- **Responsibility**: Persist events and results
- **Storage**: SQLite (local) or PostgreSQL (cloud)
- **Events**: Emits `event:created` for SSE

### Infrastructure

#### Cache (ICache)

- **Implementation**: `MemoryCache` (LRU)
- **Usage**: Deduplication, rate limiting
- **Configuration**: Max size, default TTL

#### Storage (IStorage)

- **Interface**: CRUD operations
- **Implementations**:
  - `SQLiteStorage` - Local mode
  - `PostgresStorage` - Cloud mode (planned)

#### SSE Manager

- **Responsibility**: Real-time event streaming to Dashboard
- **Protocol**: Server-Sent Events
- **Events**: `event:created`, `channel_status`, `log`

## Configuration Management

### Config File Location

- Local: `~/.notihub/config.yaml`
- Cloud: Environment variables or mounted config

### Config Schema

```yaml
version: "1"

server:
  enabled: boolean
  port: number
  mode: 'local' | 'cloud'
  auth:
    token: string

inputs:
  [name]:
    enabled: boolean
    [adapter-specific-fields]

channels:
  [name]:
    enabled: boolean
    type: 'webhook' | 'mcp' | 'api'
    [channel-specific-fields]

policies:
  deduplication:
    enabled: boolean
    ttl: number
  rate_limit:
    enabled: boolean
    max_per_minute: number
  retry:
    enabled: boolean
    max_attempts: number
    backoff: number[]
```

## Testing Strategy

### Unit Tests

- Domain models (Event validation)
- Application services (isolated with mocks)
- Adapters (input/output transformations)

### Integration Tests

- End-to-end notification flow
- Database operations
- HTTP API endpoints

### Test Structure

```
tests/
├── unit/
│   ├── domain/
│   ├── application/
│   └── adapters/
└── integration/
    ├── notification-flow.test.ts
    ├── api.test.ts
    └── storage.test.ts
```

## Performance Considerations

### Async Operations

- Event storage is non-blocking (async)
- SSE broadcasts don't block main thread
- Retry logic uses exponential backoff

### Caching

- LRU cache for deduplication (1000 entries max)
- TTL-based eviction

### Database

- Indexed columns: `trace_id`, `timestamp`, `source`
- Pagination for event queries
- Connection pooling (cloud mode)

## Security

### Authentication

- HTTP API: Bearer token validation
- Webhook signatures: HMAC-SHA256 verification

### Input Validation

- All inputs validated before processing
- Zod schemas for type safety

### Rate Limiting

- Per-minute limits to prevent abuse
- Configurable thresholds

## Deployment Modes

### Local Mode

- SQLite database
- In-memory cache
- Single-process server

### Cloud Mode

- PostgreSQL database
- Redis cache (planned)
- Horizontal scaling (stateless)

## Extensibility Points

### Adding Input Adapter

1. Create class implementing `InputAdapter`
2. Implement `parse()` to transform to Event
3. Register in `InputRegistry`
4. Add config schema

### Adding Output Channel

1. Create class implementing `Channel`
2. Implement `send()` to deliver notification
3. Register in `ChannelRegistry`
4. Add config schema

### Adding Policy

1. Create service class
2. Integrate in `NotificationService`
3. Add config options

## Future Enhancements

- [ ] Message queue integration (RabbitMQ/Redis)
- [ ] Multi-tenancy support
- [ ] Advanced routing rules (condition-based)
- [ ] Template system for cards
- [ ] Metrics export (Prometheus)
- [ ] Distributed tracing (OpenTelemetry)
